/**
 * Shared constants and helpers for the Sprite Manager tool.
 *
 * Single source of truth for the sprite naming convention and the JSON
 * response helper; imported by `sprite-manager.ts` and `sprite-generator.ts`.
 */

// `<num>-<name>.png` : num is 3 digits (001-999), name is kebab-case
export const NAME_RE = /^[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;
// Bun.Glob pattern matching the sprite convention above.
export const SPRITE_GLOB = "[0-9][0-9][0-9]-*.png";
// Managed sprite folders. Each one is independent: the manager works on a
// single selected folder at a time and never syncs renames/deletes across
// folders (each may hold a different sprite set, each keeps its own
// gapless numbering).
export const ASSET_SIZES = ["32x32", "64x64", "128x128"] as const;

/** Kebab-case a user-supplied name: lowercase, non-alphanumerics → `-`. */
export function sanitizeName(name: string): string {
	return name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** JSON response with `no-store`: renames can reuse names with new content. */
export function json(data: unknown, status = 200): Response {
	return Response.json(data, {
		status,
		headers: { "cache-control": "no-store" }
	});
}
