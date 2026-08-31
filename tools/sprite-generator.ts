/**
 * Sprite Generator — AI image generation routes for the Sprite Manager.
 *
 * Mounted by `sprite-manager.ts`: `generateRoutes` is spread into the
 * `Bun.serve` routes object. All AI Gateway traffic is server-side:
 * `AI_GATEWAY_API_KEY` is read from `process.env` and is never sent to the
 * browser.
 *
 * Routes:
 *   GET  /generate/models — favorite models (FAVORITE_IMAGE_MODELS env var,
 *                           flagged `favorite: true`) + image-generation
 *                           models fetched from the Vercel AI Gateway
 *                           (cached for the server lifetime).
 *   POST /generate        — { model, prompt } → native PNG from the model
 *                           (base64). Downscaling to the sprite grid
 *                           happens client-side on the preview canvas.
 *   POST /generate/save   — { size, name, dataUrl } → writes the downscaled
 *                           PNG as `NNN-<name>.png` in `SPRITES_ROOT/<size>/`
 *                           (each size folder has its own gapless numbering).
 *
 * Environment variables:
 *   AI_GATEWAY_API_KEY     — AI Gateway auth token (required to generate).
 *   FAVORITE_IMAGE_MODELS  — comma-separated model ids shown first, e.g.
 *                            "google/gemini-2.5-flash-image,openai/gpt-image-1".
 */

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { generateImage } from "ai";
import {
	ASSET_SIZES,
	NAME_RE,
	SPRITE_GLOB,
	SPRITES_ROOT,
	type RequestHandler,
	error,
	success,
	sanitizeName
} from "./shared";

const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";
/** Resolution requested from the model; all grids are downscaled client-side. */
const MODEL_SIZE = "1024x1024";
const MODEL_SIDE = 128;

/**
 * Provider-specific size options, keyed by the model id's provider prefix.
 *
 * No single size form works for every model (OpenAI only supports `size`,
 * bfl prefers width/height, spacexai wants aspectRatio — see the gateway
 * image-generation docs), so `size: MODEL_SIZE` is always passed plus these
 * provider options when known. Unknown provider options hard-fail (e.g.
 * prodia), so providers absent from this table get no extra options; models
 * that reject `size` warn about it (harmless). We always want a square 1:1.
 */
const PROVIDER_OPTIONS: Record<string, { width: number; height: number } | { aspectRatio: string }> = {
	bfl: { width: MODEL_SIDE, height: MODEL_SIDE },
	spacexai: { aspectRatio: "1:1" }
};

/** Appended to every prompt to force the pixel-art game-asset look;
 * override with the ADD_PROMPT_CONTEXT env var. */
const DEFAULT_ADD_PROMPT_CONTEXT =
	"Plain transparent background. Centered and filling the frame. Style: pixel art. 256 colors. Game asset (sprite)";
/**
 * When SAVE_FULLSIZE_IMAGES points to a directory (resolved relative to
 * `tools/`, like SPRITESHEET_ROOT), every original image returned by a model
 * is written there before being sent to the client — useful to compare it
 * with the downscaled grids.
 */
function fullsizeDir(): string | null {
	const raw = process.env.SAVE_FULLSIZE_IMAGES;
	if (!raw) return null;
	return join(import.meta.dir, raw);
}

type ModelInfo = { id: string; favorite: boolean };

let modelsCache: ModelInfo[] | null = null;

/** Comma-separated model ids from FAVORITE_IMAGE_MODELS, trimmed, deduped. */
function favoriteModels(): string[] {
	const raw = process.env.FAVORITE_IMAGE_MODELS ?? "";
	return [
		...new Set(
			raw
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean)
		)
	];
}

/** True when the gateway model id looks like an image-generation model. */
function isImageModel(id: string): boolean {
	return /(image|imagen|flux|dall-e|seedream|recraft|stable-diffusion|sdxl|irag|ideogram)/i.test(
		id
	);
}

/**
 * Load image models: favorites first, then the Gateway's image-generation
 * models. Falls back to favorites only when AI_GATEWAY_API_KEY is missing or
 * the Gateway is unreachable — failures are NOT cached, so the next call
 * retries (useful with `bun --hot` after fixing the env/key). Successes are
 * cached for the server lifetime.
 */
async function loadModels(): Promise<ModelInfo[]> {
	if (modelsCache) return modelsCache;
	const favorites = favoriteModels();
	const models: ModelInfo[] = favorites.map((id) => ({ id, favorite: true }));
	const apiKey = process.env.AI_GATEWAY_API_KEY;

	if (!apiKey) {
		console.warn("👽 [models] Vercel env var AI_GATEWAY_API_KEY not set, using favorites only");
		return models;
	}
	try {
		const res = await fetch(GATEWAY_MODELS_URL, {
			headers: { authorization: `Bearer ${apiKey}` },
			// bounded so a hung Gateway cannot block the first dropdown load
			signal: AbortSignal.timeout(10_000)
		});
		if (!res.ok) {
			console.warn(`👽 [models] gateway list failed: HTTP ${res.status}, using favorites only`);
			return models;
		}
		const body = (await res.json()) as { data?: { id?: string }[] };
		const gateway = (body.data ?? [])
			.map((m) => m.id ?? "")
			.filter((id) => id && !favorites.includes(id) && isImageModel(id))
			.sort()
			.map((id) => ({ id, favorite: false }));
		models.push(...gateway);
		console.log(
			`👽 [models] ${gateway.length} gateway image model(s), ${favorites.length} favorite(s)`
		);
		modelsCache = models;
		return models;
	} catch (err) {
		console.warn(`👽 [models] gateway list failed: ${String(err)}, using favorites only`);
		return models;
	}
}

/** Next free 3-digit number in `dir` (gapless: first hole, else max + 1). */
async function nextNumber(dir: string): Promise<number> {
	const used = new Set<number>();
	for (const file of new Bun.Glob(SPRITE_GLOB).scanSync({ cwd: dir })) {
		used.add(Number.parseInt(file.slice(0, 3), 10));
	}
	let n = 1;
	while (used.has(n)) n++;
	return n;
}

/** Generation timeout: REQUEST_TIMEOUT (ms) when set, 30s otherwise. */
function timeoutMs(): number {
	const timeout = Number.parseInt(`${process.env.REQUEST_TIMEOUT}`, 10);
	return timeout > 0 && timeout < 60000 ? timeout : 30000;
}

/** Prompt complement appended to every user prompt (pixel-art style hint);
 * ADD_PROMPT_CONTEXT when set, the default hint otherwise. */
function addPromptContext(): string {
	return process.env.ADD_PROMPT_CONTEXT || DEFAULT_ADD_PROMPT_CONTEXT;
}

/** Detected image format plus pixel dimensions, in one call (null when the
 * format is not recognized). Gateway models do not all return PNGs (grok
 * returns JPEGs), so neither the size parsing nor the fullsize filename may
 * assume one. `size` is null when the format is recognized but its header
 * does not parse. */
function imageInfo(
	bytes: Uint8Array
): { format: "png" | "jpeg"; size: `${number}x${number}` | null } | null {
	const isPng =
		bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
	const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
	if (!isPng && !isJpeg) return null;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (isPng) {
		if (
			bytes.length < 24 ||
			bytes[12] !== 0x49 ||
			bytes[13] !== 0x48 ||
			bytes[14] !== 0x44 ||
			bytes[15] !== 0x52
		)
			return { format: "png", size: null };
		return { format: "png", size: `${view.getUint32(16)}x${view.getUint32(20)}` };
	}
	// JPEG: walk the marker segments; SOF0–SOF15 carry the dimensions, except
	// DHT (C4), JPG (C8) and DAC (CC) which are not frame headers.
	let i = 2; // skip the SOI marker
	while (i + 4 < bytes.length) {
		if (bytes[i] !== 0xff) {
			i++;
			continue;
		}
		const marker = bytes[i + 1] ?? 0;
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
			i += 2; // standalone markers have no length field
			continue;
		}
		const segLen = view.getUint16(i + 2);
		if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
			return { format: "jpeg", size: `${view.getUint16(i + 7)}x${view.getUint16(i + 5)}` };
		}
		i += 2 + segLen;
	}
	return { format: "jpeg", size: null };
}

/** POST /generate — { model, prompt } → generate one image via the AI
 * Gateway and return it as base64 PNG. */
const generateSprite: RequestHandler = async (req) => {
	const apiKey = process.env.AI_GATEWAY_API_KEY;
	if (!apiKey) {
		return error("☠️ AI_GATEWAY_API_KEY is not set", 503);
	}
	const body = (await req.json()) as { model?: string; prompt?: string };
	const model = body.model ?? "";
	const prompt = (body.prompt ?? "").trim();
	if (!model) return error("model is required", 400);
	if (!prompt) return error("prompt is required", 400);
	// See PROVIDER_OPTIONS: only known providers get extra size options.
	const provider = model.split("/")[0] ?? "";
	const options = PROVIDER_OPTIONS[provider];
	const providerOpts = options ? { [provider]: options } : undefined;
	const signal = AbortSignal.timeout(timeoutMs());
	const fullPrompt = `${prompt}. ${addPromptContext()}`;
	console.log(`⏳ [generate] ${model}: "${fullPrompt}"`);
	try {
		const result = await generateImage({
			model,
			prompt: fullPrompt,
			size: MODEL_SIZE,
			providerOptions: providerOpts,
			abortSignal: signal
		});
		const png = result.images[0];
		if (!png) return error("model returned no image", 502);
		const info = imageInfo(png.uint8Array);
		console.log(
			`✅ [generate] received ${png.uint8Array.byteLength} byte(s) from ${model} (image ${info ? `${info.format} ${info.size ?? "unknown size"}` : "unknown format"})`
		);
		const fullsize = await saveFullsizeImage(png.uint8Array, model);
		return success({ image: Buffer.from(png.uint8Array).toString("base64"), model, fullsize });
	} catch (err) {
		const timedOut =
			err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
		const message = timedOut
			? `generation timed out after ${Math.round(timeoutMs() / 1000)}s (${model})`
			: `generation failed: ${String(err)}`;
		console.error(`❌ [generate] ${message}`);
		return error(message, timedOut ? 504 : 502);
	}
}

/** Write the original model image to the SAVE_FULLSIZE_IMAGES directory
 * (name: `<timestamp>-<model>.<png|jpg>`, extension from the actual format);
 * a no-op when the env var is not set. `createPath` lets Bun.write create
 * missing parent directories. Returns the sprite-root-relative path for the
 * client's success message, or null when disabled/failed. */
async function saveFullsizeImage(bytes: Uint8Array, model: string): Promise<string | null> {
	const dir = fullsizeDir();
	if (!dir) return null;
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const ext = imageInfo(bytes)?.format === "jpeg" ? "jpg" : "png";
	const file = join(dir, `${stamp}-${sanitizeName(model)}.${ext}`);
	try {
		await Bun.write(file, bytes, { createPath: true });
		console.log(`💾 [generate] fullsize saved to ${file}`);
		return `originals/${stamp}-${sanitizeName(model)}.${ext}`;
	} catch (err) {
		console.warn(`⚠️ [generate] could not save fullsize image: ${String(err)}`);
		return null;
	}
}

/** POST /generate/save — save a client-downscaled PNG as `NNN-<name>.png` in
 * `SPRITES_ROOT/<size>/` ({ size, name, dataUrl } body).
 *
 * Each size folder is independent and gets its own gapless numbering (the
 * folders may hold different sprite sets; nothing is synced across folders).
 */
const saveSprite: RequestHandler = async (req) => {
	const body = (await req.json()) as { size?: string; name?: string; dataUrl?: string };
	const size = body.size ?? "";
	const name = sanitizeName(body.name ?? "");
	const dataUrl = body.dataUrl ?? "";
	if (!(ASSET_SIZES as readonly string[]).includes(size)) {
		return error(`size must be one of ${ASSET_SIZES.join(", ")}`, 400);
	}
	if (!name) return error("name is required", 400);
	const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
	if (!match?.[1])
		return error("dataUrl must be a base64 PNG data URL", 400);
	const dir = join(SPRITES_ROOT, size);
	// The size folder may not exist yet (e.g. first 128x128 save) — create it
	// before nextNumber scans it; Bun.write's createPath alone is not enough.
	await mkdir(dir, { recursive: true });
	const file = `${String(await nextNumber(dir)).padStart(3, "0")}-${name}.png`;
	if (!NAME_RE.test(file))
		return error(`invalid file name: ${file}`, 400);
	const bytes = Buffer.from(match[1], "base64");
	await Bun.write(join(dir, file), bytes);
	console.log(`✅ [save-sprite] ${file} at ${size} (${bytes.byteLength} bytes)`);
	return success({ file: `${size}/${file}`, bytes: bytes.byteLength });
}

/** GET /generate/models — favorites first, plus the Gateway image models. */
const listModels: RequestHandler = async () =>
	success({ models: await loadModels(), timeoutMs: timeoutMs() });

/**
 * Generator route handlers, spread into `sprite-manager.ts`'s `Bun.serve`
 * routes object (canonical Bun form: path → method handlers). Static paths
 * only, so every handler is a plain `RequestHandler` (no dynamic `params`).
 */
export const generateRoutes = {
	"/generate/models": { GET: listModels },
	"/generate": { POST: generateSprite },
	"/generate/save": { POST: saveSprite }
};
