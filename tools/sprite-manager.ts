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
 *   32x32/           — small sprite variants, `<NNN-name>.png`
 *   64x64/           — large sprite variants, `<NNN-name>.png`
 *   export/          — generated spritesheets, `<kebab-name>-spritesheet.png`
 *
 * Sprite naming convention: `NNN-kebab-name.png` where NNN is a 3-digit index
 * (gapless after each APPLY) and kebab-name is `[a-z0-9-]+`. The manager keeps
 * 32x32 and 64x64 variants in sync: renames and deletes always touch both.
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

const SPRITES_ROOT = join(import.meta.dir, process.env.SPRITESHEET_ROOT ?? ".");
const SIZES = ["32x32", "64x64"] as const;
// `<num>-<name>.png` : num is 3 digits (001-999), name is kebab-case
const NAME_RE = /^[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;
const SPRITE_GLOB = "[0-9][0-9][0-9]-*.png";

if (!existsSync(SPRITES_ROOT)) {
	throw new Error(`Path to sprites not found. Check your environment variable SPRITESHEET_ROOT.
SPRITESHEET_ROOT="${SPRITES_ROOT}"`);
}

/** True when `name` matches the sprite convention and cannot escape ROOT. */
function validName(name: string): boolean {
	return NAME_RE.test(name) && !name.includes("..");
}

/** List the 64x64 sprite names, sorted. 32x32 mirrors the same names. */
function listSprites(): { name: string }[] {
	const dir = join(SPRITES_ROOT, "64x64");
	const names = [...new Bun.Glob(SPRITE_GLOB).scanSync({ cwd: dir })].sort();
	console.log(`[sprites] loaded ${names.length} sprite(s) from ${dir}`);
	return names.map((name) => ({ name }));
}

/** JSON response with `no-store`: renames can reuse names with new content. */
function json(data: unknown, status = 200): Response {
	return Response.json(data, {
		status,
		headers: { "cache-control": "no-store" }
	});
}

/**
 * Rename sprites (in both sizes) according to `order`.
 *
 * Two-phase rename (every source becomes a temp file, then temps become
 * their targets) so chained renames like `001-a → 002-b` while `002-b →
 * 001-a` never collide. `rename` is atomic within a filesystem; a missing
 * source is skipped (a size folder may legitimately lack a variant),
 * anything else is reported as a JSON error. `moved` counts mappings that
 * touched at least one file, not the requested count.
 */
async function applyRenames(order: { from: string; to: string }[]): Promise<Response> {
	if (!Array.isArray(order) || order.length === 0) {
		return json({ error: "body must be { order: [{ from, to }] }" }, 400);
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
	for (const size of SIZES) {
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
	}
	console.log(`[rename] applied ${touched.size}/${order.length} mapping(s) in ${SIZES.join(" + ")}`);
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
	if (!(await Bun.file(dir).exists())) await Bun.$`mkdir -p ${dir}`.quiet();
	const file = join(dir, name);
	await Bun.write(file, bytes);
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
			return json(listSprites());
		}

		if (pathname.startsWith("/32x32/") || pathname.startsWith("/64x64/")) {
			const file = pathname.split("/")[2] ?? "";
			if (req.method === "GET" && validName(file)) {
				// no-store: a rename can reuse a filename with different content
				return new Response(Bun.file(join(SPRITES_ROOT, pathname.slice(1))), {
					headers: { "cache-control": "no-store" }
				});
			}
			return json({ error: "not found" }, 404);
		}

		const spriteMatch = /^\/sprites\/([^/]+)$/.exec(pathname);
		if (spriteMatch && req.method === "DELETE") {
			const name = decodeURIComponent(spriteMatch?.[1] ?? "");
			if (!validName(name)) return json({ error: `invalid name: ${name}` }, 400);
			let deleted = 0;
			for (const size of SIZES) {
				// rm throws ENOENT when the variant is absent in that size folder
				// (legitimate) — only unexpected failures are reported.
				try {
					await rm(join(SPRITES_ROOT, size, name));
					deleted++;
					console.log(`[delete] ${size}: ${name}`);
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
						return json({ error: `cannot delete ${size}/${name}: ${String(error)}` }, 500);
					}
				}
			}
			if (deleted === 0) return json({ error: `${name} not found` }, 404);
			console.log(`[delete] removed ${name} from ${deleted} size folder(s)`);
			return json({ ok: true, deleted });
		}

		if (pathname === "/sprites/apply" && req.method === "POST") {
			const body = (await req.json()) as { order?: { from: string; to: string }[] };
			return applyRenames(body.order ?? []);
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
