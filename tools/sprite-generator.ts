/**
 * Sprite Generator — AI image generation routes for the Sprite Manager.
 *
 * Mounted by `sprite-manager.ts` via `handleGenerateRoutes()`. All AI Gateway
 * traffic is server-side: `VERCEL_API_KEY` is read from `process.env` and is
 * never sent to the browser.
 *
 * Routes:
 *   GET  /generate/models — favorite models (FAVORITE_IMAGE_MODELS env var,
 *                           flagged `favorite: true`) + image-generation
 *                           models fetched from the Vercel AI Gateway
 *                           (cached for the server lifetime).
 *   POST /generate        — { model, prompt, size } → native PNG from the
 *                           model (base64). Downscaling to the sprite grid
 *                           happens client-side on the preview canvas.
 *   POST /generate/save   — { size, name, dataUrl } → writes the downscaled
 *                           PNG as `NNN-<name>.png` (next gapless number) in
 *                           `SPRITES_ROOT/<size>/`.
 *
 * Environment variables:
 *   VERCEL_API_KEY         — AI Gateway auth token (required to generate).
 *   FAVORITE_IMAGE_MODELS  — comma-separated model ids shown first, e.g.
 *                            "google/gemini-2.5-flash-image,openai/gpt-image-1".
 */

import { join } from "node:path";
import { generateImage } from "ai";

// The AI SDK's Gateway provider expects AI_GATEWAY_API_KEY; the project
// exposes the token as VERCEL_API_KEY, so bridge it (no-op when already set).
process.env.AI_GATEWAY_API_KEY ??= process.env.VERCEL_API_KEY;

const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";
/** Largest sprite size we generate for; */
const SIZES = ["32x32", "64x64", "128x128"] as const;
/** Resolution requested from the model; all grids are downscaled client-side. */
const MODEL_SIZE = "1024x1024";
const MODEL_SIDE = 128;
/** Default generation timeout; override with the REQUEST_TIMEOUT env var (ms). */
const DEFAULT_TIMEOUT_MS = 30_000;
const NAME_RE = /^[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;

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
 * List image models: favorites first, then the Gateway's image-generation
 * models. Falls back to favorites only when VERCEL_API_KEY is missing or the
 * Gateway is unreachable. Cached for the server lifetime.
 */
async function listModels(): Promise<ModelInfo[]> {
	if (modelsCache) return modelsCache;
	const favorites = favoriteModels();
	const models: ModelInfo[] = favorites.map((id) => ({ id, favorite: true }));
	const apiKey = process.env.AI_GATEWAY_API_KEY;

	if (apiKey) {
		try {
			const res = await fetch(GATEWAY_MODELS_URL, {
				headers: { authorization: `Bearer ${apiKey}` }
			});
			if (res.ok) {
				const body = (await res.json()) as { data?: { id?: string }[] };
				const gateway = (body.data ?? [])
					.map((m) => m.id ?? "")
					.filter((id) => id && !favorites.includes(id) && isImageModel(id))
					.sort()
					.map((id) => ({ id, favorite: false }));
				models.push(...gateway);
				console.log(
					`[models] 👽 ${gateway.length} gateway image model(s), ${favorites.length} favorite(s)`
				);
			} else {
				console.warn(`[models] 👽 gateway list failed: HTTP ${res.status}, using favorites only`);
			}
		} catch (error) {
			console.warn(`[models] 👽 gateway list failed: ${String(error)}, using favorites only`);
		}
	} else {
		console.warn("[models] 👽 Vercel env var AI_GATEWAY_API_KEY not set, using favorites only");
	}
	modelsCache = models;
	return models;
}

/** Next free 3-digit number in `dir` (gapless: first hole, else max + 1). */
async function nextNumber(dir: string): Promise<number> {
	const used = new Set<number>();
	for (const file of new Bun.Glob("[0-9][0-9][0-9]-*.png").scanSync({ cwd: dir })) {
		used.add(Number.parseInt(file.slice(0, 3), 10));
	}
	let n = 1;
	while (used.has(n)) n++;
	return n;
}

/** Kebab-case a user-supplied name: lowercase, non-alphanumerics → `-`. */
function sanitizeName(name: string): string {
	return name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Generation timeout: REQUEST_TIMEOUT (ms) when set, 30s otherwise. */
function timeoutMs(): number {
	const raw = process.env.REQUEST_TIMEOUT;
	const n = raw ? Number(raw) : Number.NaN;
	return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

/** Width/height of a PNG image, from the IHDR chunk (bytes 16–24). */
function pngSize(bytes: Uint8Array): `${number}x${number}` | null {
	if (bytes.length < 24 || bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
		return null;
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return `${view.getUint32(16)}x${view.getUint32(20)}`;
}

/** Generate one image via the AI Gateway and return it as base64 PNG. */
async function generateSprite(req: Request): Promise<Response> {
	const apiKey = process.env.AI_GATEWAY_API_KEY;
	if (!apiKey) {
		return Response.json({ error: "☠️ AI_GATEWAY_API_KEY is not set" }, { status: 503 });
	}
	const body = (await req.json()) as { model?: string; prompt?: string; size?: string };
	const model = body.model ?? "";
	const prompt = (body.prompt ?? "").trim();
	const size = body.size ?? "";
	if (!model) return Response.json({ error: "model is required" }, { status: 400 });
	if (!prompt) return Response.json({ error: "prompt is required" }, { status: 400 });
	if (!(SIZES as readonly string[]).includes(size)) {
		return Response.json({ error: `size must be one of ${SIZES.join(", ")}` }, { status: 400 });
	}
	// No single size form works for every model (OpenAI only supports `size`,
	// bfl prefers width/height, spacexai wants aspectRatio — see the gateway
	// image-generation docs), so pass `size` plus the provider's width/height.
	// Unknown provider options hard-fail (e.g. prodia), so width/height is
	// only sent to providers known to accept them; the others warn or ignore.
	// We always want a square 1:1 image.
	const PROVIDERS_WIDTH_HEIGHT = new Set(["bfl"]);
	const provider = model.split("/")[0] ?? "";
	const signal = AbortSignal.timeout(timeoutMs());
	console.log(`[generate] ${model} for ${size}: "${prompt}"`);
	try {
		const result = await generateImage({
			model,
			prompt,
			size: MODEL_SIZE,
			providerOptions: PROVIDERS_WIDTH_HEIGHT.has(provider)
				? { [provider]: { width: MODEL_SIDE, height: MODEL_SIDE } }
				: undefined,
			abortSignal: signal
		});
		const png = result.images[0];
		if (!png) return Response.json({ error: "model returned no image" }, { status: 502 });
		console.log(
			`[generate] ✅ got ${png.uint8Array.byteLength} byte(s) from ${model} (image ${pngSize(png.uint8Array) ?? "unknown size"})`
		);
		return Response.json({ image: Buffer.from(png.uint8Array).toString("base64"), model, size });
	} catch (error) {
		const timedOut =
			error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
		const message = timedOut
			? `generation timed out after ${Math.round(timeoutMs() / 1000)}s (${model})`
			: `generation failed: ${String(error)}`;
		console.error(`[generate] ❌ ${message}`);
		return Response.json({ error: message }, { status: timedOut ? 504 : 502 });
	}
}

/** Save a client-downscaled PNG as `NNN-<name>.png` in `SPRITES_ROOT/<size>/`. */
async function saveSprite(req: Request, spritesRoot: string): Promise<Response> {
	const body = (await req.json()) as { size?: string; name?: string; dataUrl?: string };
	const size = body.size ?? "";
	const name = sanitizeName(body.name ?? "");
	const dataUrl = body.dataUrl ?? "";
	if (!(SIZES as readonly string[]).includes(size)) {
		return Response.json({ error: `size must be one of ${SIZES.join(", ")}` }, { status: 400 });
	}
	if (!name) return Response.json({ error: "name is required" }, { status: 400 });
	const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
	if (!match?.[1])
		return Response.json({ error: "dataUrl must be a base64 PNG data URL" }, { status: 400 });
	const dir = join(spritesRoot, size);
	await Bun.$`mkdir -p ${dir}`.quiet();
	const file = `${String(await nextNumber(dir)).padStart(3, "0")}-${name}.png`;
	if (!NAME_RE.test(file))
		return Response.json({ error: `invalid file name: ${file}` }, { status: 400 });
	const bytes = Buffer.from(match[1], "base64");
	await Bun.write(join(dir, file), bytes);
	console.log(`[save-sprite] ✅ ${file} at ${size} (${bytes.byteLength} bytes)`);
	return Response.json({ ok: true, file: `${size}/${file}`, bytes: bytes.byteLength });
}

/**
 * Route dispatch for the generator. Returns `null` when `pathname` is not a
 * generator route so the caller can keep routing.
 */
export async function handleGenerateRoutes(
	req: Request,
	pathname: string,
	spritesRoot: string
): Promise<Response | null> {
	if (pathname === "/generate/models" && req.method === "GET") {
		return Response.json(await listModels(), { headers: { "cache-control": "no-store" } });
	}
	if (pathname === "/generate" && req.method === "POST") {
		return generateSprite(req);
	}
	if (pathname === "/generate/save" && req.method === "POST") {
		return saveSprite(req, spritesRoot);
	}
	return null;
}
