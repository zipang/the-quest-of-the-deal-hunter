/**
 * Reusable canvas background removal.
 *
 * AI image models rarely produce real alpha transparency: they either flatten
 * the background or paint a checker pattern to *evoke* it. This module cleans
 * a canvas client-side without any user parameter:
 *
 * 1. Sample the 4 corner pixels — the background always touches them.
 * 2. Cluster near-equal corners into background tones (a checkered backdrop
 *    yields 2+, a solid one 1; this handles N tones by near-equality chaining).
 * 3. Derive the tolerance from the corner spread, not a constant, so a tight
 *    corner spread cannot leak through anti-aliased sprite edges.
 * 4. Flood-fill from the borders: only background-connected pixels become
 *    transparent, so same-colored pixels *inside* the sprite are protected.
 *
 * `removeBackground(canvas)` returns an `undo()` restoring the exact original
 * pixels — the canvas is the only kept state.
 */

/** Squared distance between two RGBA colors (max channel diff drives it). */
function colorDistance(a: [number, number, number], b: [number, number, number]): number {
	return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

/**
 * Cluster colors by chaining near-equality: each color joins the first
 * cluster whose reference it is within `tolerance` of, so N distinct tones
 * produce N clusters without a fixed cluster count.
 */
function clusterColors(
	colors: [number, number, number][],
	tolerance: number
): [number, number, number][] {
	const refs: [number, number, number][] = [];
	for (const c of colors) {
		const ref = refs.find((r) => colorDistance(r, c) <= tolerance);
		if (!ref) refs.push(c);
	}
	return refs;
}

/**
 * Remove the canvas background, guessed from its corner pixels: the corners
 * are clustered into background tones, the tolerance is derived from their
 * spread, and a border flood-fill turns every connected matching pixel
 * transparent. Returns an `undo()` restoring the pre-removal pixels.
 */
export function removeBackground(canvas: HTMLCanvasElement): () => void {
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return () => {};
	const w = canvas.width;
	const h = canvas.height;
	// Two copies: `cleaned` is mutated in place and applied; `original` stays
	// untouched so undo() restores the exact pre-removal pixels.
	const cleaned = ctx.getImageData(0, 0, w, h);
	const original = ctx.getImageData(0, 0, w, h);
	const data = cleaned.data;

	// RGB of the pixel starting at byte index i (noUncheckedIndexedAccess:
	// Uint8Array reads are possibly-undefined, impossible in-bounds here).
	const pxAt = (i: number): [number, number, number] => [
		data[i] ?? 0,
		data[i + 1] ?? 0,
		data[i + 2] ?? 0
	];

	const corners: [number, number, number][] = [
		pxAt(0),
		pxAt((w - 1) * 4),
		pxAt((h - 1) * w * 4),
		pxAt(((h - 1) * w + w - 1) * 4)
	];

	// Seed tolerance: corners of a checkered backdrop are two flat tones, so a
	// small fixed spread merges anti-aliasing noise but keeps real tones apart.
	const backgroundTones = clusterColors(corners, 12);
	// Tolerance grows with how much the background tones themselves differ:
	// a busy backdrop gets a looser match, a flat one stays tight.
	const spread = backgroundTones.length > 1
		? Math.max(...backgroundTones.map((a) => Math.max(...backgroundTones.map((b) => colorDistance(a, b)))))
		: 0;
	const tolerance = 12 + spread;

	// Live-debug log: corner samples and the tones they were clustered into,
	// so a mis-detection is visible straight in the browser console.
	const rgb = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
	console.log(
		`[background-removal] ${w}x${h} corners: ${corners.map(rgb).join(", ")} → ` +
			`${backgroundTones.length} tone(s): ${backgroundTones.map(rgb).join(", ")} ` +
			`(tolerance ${tolerance})`
	);

	const isBackground = (i: number): boolean => {
		if (data[i + 3] === 0) return true; // already transparent
		return backgroundTones.some((t) => colorDistance(t, pxAt(i)) <= tolerance);
	};

	// Border flood-fill (stack-based, iterative): only pixels connected to
	// the frame through background colors are cleared, protecting interior
	// pixels of the same color.
	const visited = new Uint8Array(w * h);
	const stack: number[] = [];
	for (let x = 0; x < w; x++) {
		stack.push(x, (h - 1) * w + x);
	}
	for (let y = 0; y < h; y++) {
		stack.push(y * w, y * w + w - 1);
	}
	while (stack.length > 0) {
		const p = stack.pop() as number;
		if (visited[p]) continue;
		visited[p] = 1;
		const i = p * 4;
		if (!isBackground(i)) continue;
		data[i + 3] = 0;
		const x = p % w;
		if (x > 0) stack.push(p - 1);
		if (x < w - 1) stack.push(p + 1);
		if (p >= w) stack.push(p - w);
		if (p < w * (h - 1)) stack.push(p + w);
	}

	ctx.putImageData(cleaned, 0, 0);
	return () => ctx.putImageData(original, 0, 0);
}
