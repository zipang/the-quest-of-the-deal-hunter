/**
 * Shared constants and helpers for the Sprite Manager tool.
 *
 * Single source of truth for the sprite naming convention, the asset root and
 * the JSON response helpers; imported by `sprite-manager.ts` and
 * `sprite-generator.ts`.
 */

import { join } from "node:path";
import type { BunRequest } from "bun";

// `<num>-<name>.png` : num is 3 digits (001-999), name is kebab-case
export const NAME_RE = /^[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;
// Bun.Glob pattern matching the sprite convention above.
export const SPRITE_GLOB = "[0-9][0-9][0-9]-*.png";
// Managed sprite folders. Each one is independent: the manager works on a
// single selected folder at a time and never syncs renames/deletes across
// folders (each may hold a different sprite set, each keeps its own
// gapless numbering).
export const ASSET_SIZES = ["32x32", "64x64", "128x128"] as const;

/** Asset root: SPRITESHEET_ROOT resolved against `tools/` (this file's
 * directory), so the server can be launched from any working directory. */
export const SPRITES_ROOT = join(import.meta.dir, process.env.SPRITESHEET_ROOT ?? ".");

/** Kebab-case a user-supplied name: lowercase, non-alphanumerics → `-`. */
export function sanitizeName(name: string): string {
	return name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Bun route handler for a static path: receives the request and returns the
 * Response. Every route handler of the Sprite Manager server is declared as a
 * dedicated named function typed with this interface (or `RouteHandler` below
 * for dynamic paths), then assembled into the `Bun.serve` routes object.
 */
export interface RequestHandler {
	(req: Request): Response | Promise<Response>;
}

/**
 * Bun route handler for a DYNAMIC path (e.g. `/sprites/:name`): receives the
 * request with typed `params` and returns the Response.
 */
export interface RouteHandler<Path extends string> {
	(req: BunRequest<Path>): Response | Promise<Response>;
}

/**
 * Uniform JSON API envelope, sent with `no-store` (renames can reuse names
 * with new content):
 * - `success(data, status = 200)` → `{ ok: true, ...data }`
 * - `error(msg, status = 500)`    → `{ ok: false, error: msg }`
 */
export function success(data: Record<string, unknown>, status = 200): Response {
	return Response.json({ ok: true, ...data }, {
		status,
		headers: { "cache-control": "no-store" }
	});
}

export function error(msg: string, status = 500): Response {
	return Response.json({ ok: false, error: msg }, {
		status,
		headers: { "cache-control": "no-store" }
	});
}
