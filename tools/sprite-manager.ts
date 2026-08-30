/**
 * Sprite Manager — local dev server.
 *
 * Serves the sprite-manager UI (`sprite-manager.html`) and a small REST API to
 * manage the game sprite assets on disk. Run with Bun:
 *
 *   bun tools/sprite-manager.ts
 *
 * Asset layout, relative to SPRITESHEET_ROOT (see below):
 *
 *   32x32/ 64x64/ 128x128/ — managed sprite folders, `<NNN-name>.png`
 *   export/                — generated spritesheets, `<kebab-name>-spritesheet.png`
 *
 * Sprite naming convention: `NNN-kebab-name.png` where NNN is a 3-digit index
 * (gapless per folder, see shared.ts) and kebab-name is `[a-z0-9-]+`. Each
 * size folder is independent: every route targets ONE size (selected in the
 * UI) and never touches the other folders.
 *
 * The Generate tab routes (AI sprite generation) live in `sprite-generator.ts`
 * and are dispatched at the end of `fetch`.
 *
 * SPRITESHEET_ROOT: optional env var pointing to the asset root. Relative
 * paths are resolved against this file's directory (`tools/`), so the server
 * can be launched from any working directory. Defaults to `tools/` itself.
 */
import { existsSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { handleGenerateRoutes } from "./sprite-generator";
import { ASSET_SIZES, NAME_RE, SPRITE_GLOB, json } from "./shared";

const SPRITES_ROOT = join(import.meta.dir, process.env.SPRITESHEET_ROOT ?? ".");

if (!existsSync(SPRITES_ROOT)) {
	throw new Error(`Path to sprites not found. Check your environment variable SPRITESHEET_ROOT.
SPRITESHEET_ROOT="${SPRITES_ROOT}"`);
}

/** True when `name` matches the sprite convention (the regex allows no path
 * separators and no dots outside the final `.png`, so it cannot escape ROOT). */
function validName(name: string): boolean {
	return NAME_RE.test(name);
}

/** True when `size` is one of the managed sprite folders. */
function validSize(size: string): boolean {
	return (ASSET_SIZES as readonly string[]).includes(size);
}

/** List the sprite names of one size folder, sorted. A missing folder lists
 * as empty (it gets created on first save). */
function listSprites(size: string): { name: string }[] {
	const dir = join(SPRITES_ROOT, size);
	if (!existsSync(dir)) return [];
	const names = [...new Bun.Glob(SPRITE_GLOB).scanSync({ cwd: dir })].sort();
	console.log(`[sprites] loaded ${names.length} sprite(s) from ${dir}`);
	return names.map((name) => ({ name }));
}

/**
 * Rename sprites of ONE size folder according to `order`.
 *
 * Two-phase rename (every source becomes a temp file, then temps become
 * their targets) so chained renames like `001-a → 002-b` while `002-b →
 * 001-a` never collide. `rename` is atomic within a filesystem; a missing
 * source is skipped (the folder may not hold every sprite), anything else
 * is reported as a JSON error. `moved` counts mappings that touched at
 * least one file, not the requested count.
 */
async function applyRenames(size: string, order: { from: string; to: string }[]): Promise<Response> {
	if (!Array.isArray(order) || order.length === 0) {
		return json({ error: "body must be { size, order: [{ from, to }] }" }, 400);
	}
	for (const m of order) {
		if (!validName(m.from) || !validName(m.to)) {
			return json({ error: `invalid name: ${JSON.stringify(m)}` }, 400);
		}
	}
	const targets = new Set(order.map((m) => m.to));
	if (targets.size !== order.length) {
		return json({ error: "duplicate target names in mapping" }, 400);
	}
	// Mapping indexes whose files actually moved (ENOENT on the temp file in
	// phase 2 means the source never existed — skipped, not an error).
	const touched = new Set<number>();
	const dir = join(SPRITES_ROOT, size);
	for (const [i, m] of order.entries()) {
		try {
			await rename(join(dir, m.from), join(dir, `.tmp-${i}.png`));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				return json({ error: `cannot stage ${size}/${m.from}: ${String(error)}` }, 500);
			}
		}
	}
	for (const [i, m] of order.entries()) {
		try {
			await rename(join(dir, `.tmp-${i}.png`), join(dir, m.to));
			touched.add(i);
			console.log(`[rename] ${size}: ${m.from} -> ${m.to}`);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				return json({ error: `cannot rename ${size}/${m.from}: ${String(error)}` }, 500);
			}
		}
	}
	console.log(`[rename] applied ${touched.size}/${order.length} mapping(s) in ${size}/`);
	return json({ ok: true, moved: touched.size });
}

// export/<kebab-name>-spritesheet.png
const EXPORT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-spritesheet\.png$/;

/** Decode a base64 PNG data URL and write it to `export/<name>`. */
async function saveSpritesheet(req: Request): Promise<Response> {
	const body = (await req.json()) as { name?: string; dataUrl?: string };
	const name = body.name ?? "";
	const dataUrl = body.dataUrl ?? "";
	if (!EXPORT_RE.test(name)) {
		return json({ error: "name must match <kebab-name>-spritesheet.png" }, 400);
	}
	const dataUrlMatch = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
	const payload = dataUrlMatch?.[1];
	if (!payload) return json({ error: "dataUrl must be a base64 PNG data URL" }, 400);
	const bytes = Buffer.from(payload, "base64");
	const dir = join(SPRITES_ROOT, "export");
	const file = join(dir, name);
	// createPath: export/ does not exist until the first export
	await Bun.write(file, bytes, { createPath: true });
	console.log(`[spritesheet] saved ${file} (${bytes.byteLength} bytes)`);
	return json({ ok: true, file: `export/${name}`, bytes: bytes.byteLength });
}

const server = Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);
		const { pathname } = url;

		if (pathname === "/" || pathname === "/sprite-manager.html") {
			// the UI always lives next to this script, whatever SPRITESHEET_ROOT is
			return new Response(Bun.file(join(import.meta.dir, "sprite-manager.html")), {
				headers: { "cache-control": "no-store" }
			});
		}

		if (pathname === "/sprites" && req.method === "GET") {
			// one size folder per request; 64x64 keeps older clients working
			const size = url.searchParams.get("size") ?? "64x64";
			if (!validSize(size)) {
				return json({ error: `size must be one of ${ASSET_SIZES.join(", ")}` }, 400);
			}
			return json(listSprites(size));
		}

		const [, sizeSegment, fileSegment] = pathname.split("/");
		if ((ASSET_SIZES as readonly string[]).includes(sizeSegment)) {
			if (req.method === "GET" && validName(fileSegment ?? "")) {
				const path = join(SPRITES_ROOT, sizeSegment, fileSegment);
				// exists check first: Bun.file streams would surface a missing
				// file as an HTML 500 error page instead of a JSON 404
				if (!(await Bun.file(path).exists())) return json({ error: "not found" }, 404);
				// no-store: a rename can reuse a filename with different content
				return new Response(Bun.file(path), {
					headers: { "cache-control": "no-store" }
				});
			}
			return json({ error: "not found" }, 404);
		}

		const spriteMatch = /^\/sprites\/([^/]+)$/.exec(pathname);
		if (spriteMatch && req.method === "DELETE") {
			const name = decodeURIComponent(spriteMatch?.[1] ?? "");
			// one size folder per request; 64x64 keeps older clients working
			const size = url.searchParams.get("size") ?? "64x64";
			if (!validName(name)) return json({ error: `invalid name: ${name}` }, 400);
			if (!validSize(size)) {
				return json({ error: `size must be one of ${ASSET_SIZES.join(", ")}` }, 400);
			}
			// rm throws ENOENT when the sprite is absent in that folder
			// (legitimate) — only unexpected failures are reported.
			try {
				await rm(join(SPRITES_ROOT, size, name));
				console.log(`[delete] ${size}: ${name}`);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
					return json({ error: `cannot delete ${size}/${name}: ${String(error)}` }, 500);
				}
				return json({ error: `${name} not found in ${size}/` }, 404);
			}
			return json({ ok: true, deleted: 1 });
		}

		if (pathname === "/sprites/apply" && req.method === "POST") {
			const body = (await req.json()) as {
				size?: string;
				order?: { from: string; to: string }[];
			};
			const size = body.size ?? "64x64";
			if (!validSize(size)) {
				return json({ error: `size must be one of ${ASSET_SIZES.join(", ")}` }, 400);
			}
			return applyRenames(size, body.order ?? []);
		}

		if (pathname === "/spritesheets" && req.method === "POST") {
			return saveSpritesheet(req);
		}

		const generateResponse = await handleGenerateRoutes(req, pathname, SPRITES_ROOT);
		if (generateResponse) return generateResponse;

		return json({ error: `no route: ${req.method} ${pathname}` }, 404);
	}
});

console.log(`👾 Sprite Manager running at http://localhost:${server.port}`);
