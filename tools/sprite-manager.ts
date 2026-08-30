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
 * and are spread into the routes object below.
 *
 * SPRITESHEET_ROOT: optional env var pointing to the asset root. Relative
 * paths are resolved against this file's directory (`tools/`), so the server
 * can be launched from any working directory. Defaults to `tools/` itself.
 */
import { existsSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { generateRoutes } from "./sprite-generator";
import {
	ASSET_SIZES,
	NAME_RE,
	SPRITE_GLOB,
	SPRITES_ROOT,
	type RequestHandler,
	type RouteHandler,
	error,
	success
} from "./shared";
// HTML entrypoint: Bun bundles the inline app script (with its ./dialog.ts
// import) and the ./dialog.css stylesheet at serve time.
import spriteManagerHtml from "./sprite-manager.html";

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
function spriteNames(size: string): { name: string }[] {
	const dir = join(SPRITES_ROOT, size);
	if (!existsSync(dir)) return [];
	const names = [...new Bun.Glob(SPRITE_GLOB).scanSync({ cwd: dir })].sort();
	console.log(`[sprites] loaded ${names.length} sprite(s) from ${dir}`);
	return names.map((name) => ({ name }));
}

/**
 * POST /sprites/apply — commit the renames of one size folder according to
 * the `order` body mapping.
 *
 * Two-phase rename (every source becomes a temp file, then temps become
 * their targets) so chained renames like `001-a → 002-b` while `002-b →
 * 001-a` never collide. `rename` is atomic within a filesystem; a missing
 * source is skipped (the folder may not hold every sprite), anything else
 * is reported as a JSON error. `moved` counts mappings that touched at
 * least one file, not the requested count.
 */
const applyRenames: RequestHandler = async (req) => {
	const body = (await req.json()) as {
		size?: string;
		order?: { from: string; to: string }[];
	};
	const size = body.size ?? "64x64";
	if (!validSize(size)) {
		return error(`size must be one of ${ASSET_SIZES.join(", ")}`, 400);
	}
	const order = body.order ?? [];
	if (!Array.isArray(order) || order.length === 0) {
		return error("body must be { size, order: [{ from, to }] }", 400);
	}
	for (const m of order) {
		if (!validName(m.from) || !validName(m.to)) {
			return error(`invalid name: ${JSON.stringify(m)}`, 400);
		}
	}
	const targets = new Set(order.map((m) => m.to));
	if (targets.size !== order.length) {
		return error("duplicate target names in mapping", 400);
	}
	// Mapping indexes whose files actually moved (ENOENT on the temp file in
	// phase 2 means the source never existed — skipped, not an error).
	const touched = new Set<number>();
	const dir = join(SPRITES_ROOT, size);
	for (const [i, m] of order.entries()) {
		try {
			await rename(join(dir, m.from), join(dir, `.tmp-${i}.png`));
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
				return error(`cannot stage ${size}/${m.from}: ${String(err)}`, 500);
			}
		}
	}
	for (const [i, m] of order.entries()) {
		try {
			await rename(join(dir, `.tmp-${i}.png`), join(dir, m.to));
			touched.add(i);
			console.log(`[rename] ${size}: ${m.from} -> ${m.to}`);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
				return error(`cannot rename ${size}/${m.from}: ${String(err)}`, 500);
			}
		}
	}
	console.log(`[rename] applied ${touched.size}/${order.length} mapping(s) in ${size}/`);
	return success({ moved: touched.size });
}

// export/<kebab-name>-spritesheet.png
const EXPORT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-spritesheet\.png$/;

/** POST /spritesheets — save a PNG data URL to `export/<name>`. */
const saveSpritesheet: RequestHandler = async (req) => {
	const body = (await req.json()) as { name?: string; dataUrl?: string };
	const name = body.name ?? "";
	const dataUrl = body.dataUrl ?? "";
	if (!EXPORT_RE.test(name)) {
		return error("name must match <kebab-name>-spritesheet.png", 400);
	}
	const dataUrlMatch = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
	const payload = dataUrlMatch?.[1];
	if (!payload) return error("dataUrl must be a base64 PNG data URL", 400);
	const bytes = Buffer.from(payload, "base64");
	const dir = join(SPRITES_ROOT, "export");
	const file = join(dir, name);
	// createPath: export/ does not exist until the first export
	await Bun.write(file, bytes, { createPath: true });
	console.log(`[spritesheet] saved ${file} (${bytes.byteLength} bytes)`);
	return success({ file: `export/${name}`, bytes: bytes.byteLength });
}

// ---------------------------------------------------------------------------
// Route handlers — one named function per route, assembled into the routes
// object below. Static paths use the simple `RequestHandler` interface from
// shared.ts; dynamic paths (`:name`, `:size`) use `RouteHandler<Path>` to
// get typed `params`.
// ---------------------------------------------------------------------------

/** GET /sprites — list the sprite names of one size folder; 64x64 keeps
 * older clients working. */
const listSprites: RequestHandler = (req) => {
	const size = new URL(req.url).searchParams.get("size") ?? "64x64";
	if (!validSize(size)) {
		return error(`size must be one of ${ASSET_SIZES.join(", ")}`, 400);
	}
	return success({ sprites: spriteNames(size) });
};

/** DELETE /sprites/:name — delete one sprite from a size folder; 64x64
 * keeps older clients working. */
const deleteSprite: RouteHandler<"/sprites/:name"> = async (req) => {
	const name = req.params.name;
	const size = new URL(req.url).searchParams.get("size") ?? "64x64";
	if (!validName(name)) return error(`invalid name: ${name}`, 400);
	if (!validSize(size)) {
		return error(`size must be one of ${ASSET_SIZES.join(", ")}`, 400);
	}
	// rm throws ENOENT when the sprite is absent in that folder
	// (legitimate) — only unexpected failures are reported.
	try {
		await rm(join(SPRITES_ROOT, size, name));
		console.log(`[delete] ${size}: ${name}`);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
			return error(`cannot delete ${size}/${name}: ${String(err)}`, 500);
		}
		return error(`${name} not found in ${size}/`, 404);
	}
	return success({ deleted: 1 });
};

/** POST /spritesheets — save a PNG data URL to export/<name>. */
/** GET /:size/:file — serve one sprite file of a size folder. */
const getSpriteFile: RouteHandler<"/:size/:file"> = async (req) => {
	const { size, file } = req.params;
	if (!validSize(size) || !validName(file)) return error("not found", 404);
	const path = join(SPRITES_ROOT, size, file);
	// exists check first: Bun.file streams would surface a missing
	// file as an HTML 500 error page instead of a JSON 404
	if (!(await Bun.file(path).exists())) return error("not found", 404);
	// no-store: a rename can reuse a filename with different content
	return new Response(Bun.file(path), {
		headers: { "cache-control": "no-store" }
	});
};

/** JSON catch-all for every request no route above matched. */
const noRoute = (req: Request): Response =>
	error(`no route: ${req.method} ${new URL(req.url).pathname}`, 404);

const server = Bun.serve({
	port: 3000,
	routes: {
		// the UI always lives next to this script, whatever SPRITESHEET_ROOT is
		"/": spriteManagerHtml,
		"/sprite-manager.html": spriteManagerHtml,
		"/sprites": { GET: listSprites },
		"/sprites/apply": { POST: applyRenames },
		"/sprites/:name": { DELETE: deleteSprite },
		"/spritesheets": { POST: saveSpritesheet },
		// AI sprite generation (sprite-generator.ts)
		...generateRoutes,
		"/:size/:file": { GET: getSpriteFile }
	},
	fetch: noRoute
});

console.log(`👾 Sprite Manager running at http://localhost:${server.port}`);
