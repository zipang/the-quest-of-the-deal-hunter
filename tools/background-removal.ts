/**
 * Reusable canvas background removal.
 *
 * AI image models rarely produce real alpha transparency: they either flatten
 * the background or paint a checker pattern to *evoke* it. This module cleans
 * a canvas client-side without any user parameter:
 *
 * 1. Sample the whole top line — every checker phase is covered. Pixels
 *    wildly different from the line's median are dropped first, so a
 *    subject bleeding out of its cell cannot poison the color range.
 * 2. Cluster near-equal samples into background tones (a checkered backdrop
 *    yields 2+, a solid one 1; near-equality chaining handles N tones);
 *    tones seen only once are sampling noise and are dropped.
 * 3. Derive the tolerance from the tone spread, not a constant, so a tight
 *    tone spread cannot leak through anti-aliased sprite edges. Capped so
 *    opposite black/white tones cannot make every pixel "background".
 * 4. Match pixels per scenario: a neutral backdrop (grey/white checker)
 *    clears low-chroma pixels at the right luminance; a saturated backdrop
 *    (plain color) clears pixels whose hue agrees — a sprite patch with the
 *    same luminance but an obvious different hue is kept.
 * 5. Flood-fill from the borders: only background-connected pixels become
 *    transparent, so same-colored pixels *inside* the sprite are protected.
 *
 * `removeBackground(canvas)` returns an `undo()` restoring the exact original
 * pixels — the canvas is the only kept state.
 */

/** Max channel diff between two RGB colors. */
function colorDistance(a: [number, number, number], b: [number, number, number]): number {
	return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

/** HSL of an RGB color: h in degrees (0 for neutrals), s/l in 0..1. */
function rgbToHsl(c: [number, number, number]): { h: number; s: number; l: number } {
	const [r, g, b] = [c[0] / 255, c[1] / 255, c[2] / 255];
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h: number;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
	else if (max === g) h = ((b - r) / d + 2) * 60;
	else h = ((r - g) / d + 4) * 60;
	return { h, s, l };
}

/** Smallest distance between two hues in degrees (0..180). */
function hueDistance(a: number, b: number): number {
	const d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
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
 * Remove the canvas background, guessed from its top line: the line's
 * non-outlier pixels are clustered into background tones, the tolerance is
 * derived from their spread, and a border flood-fill turns every connected
 * matching pixel transparent. Returns an `undo()` restoring the pre-removal
 * pixels.
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

	// Sampling: the whole top line — any checker phase is covered. Pixels
	// WILDLY different from the line's median are dropped first: a subject
	// bleeding out of its cell (cropped sprite) would otherwise poison the
	// range with its own colors.
	const samples: [number, number, number][] = [];
	for (let i = 0; i < w; i++) samples.push(pxAt(i * 4));
	const medianOf = (channel: number) => {
		const sorted = samples.map((s) => s[channel]).sort((a, b) => (a ?? 0) - (b ?? 0));
		return sorted[Math.floor(sorted.length / 2)] ?? 0;
	};
	const median: [number, number, number] = [medianOf(0), medianOf(1), medianOf(2)];
	const OUTLIER_DISTANCE = 60; // far beyond checker-tone spread (≤ ~80 total)
	const inliers = samples.filter((s) => colorDistance(median, s) <= OUTLIER_DISTANCE);

	// A small fixed spread merges anti-aliasing noise but keeps real tones
	// apart; a tone seen once is sampling noise (JPEG artifact), a real
	// backdrop tone recurs.
	const SEED_TOLERANCE = 12;
	const backgroundTones = clusterColors(inliers, SEED_TOLERANCE).filter(
		(tone) => inliers.filter((s) => colorDistance(tone, s) <= SEED_TOLERANCE).length >= 2
	);

	// Tolerance grows with how much the background tones themselves differ:
	// a busy backdrop gets a looser match, a flat one stays tight. Capped so
	// opposite black/white tones cannot make every pixel "background".
	const spread =
		backgroundTones.length > 1
			? Math.max(...backgroundTones.map((a) => Math.max(...backgroundTones.map((b) => colorDistance(a, b)))))
			: 0;
	const tolerance = Math.min(100, SEED_TOLERANCE + spread);

	// Hue-aware matching, adapted to the two backdrop scenarios:
	// - unsaturated checkered patterns (two greys/whites): a pixel matches
	//   when its luminance is within tolerance AND its chroma (max-min, the
	//   absolute color amount) is tiny — HSL saturation alone would explode
	//   on near-white JPEG noise and leave checker residue behind;
	// - plain background of any color (may be saturated): luminance AND hue
	//   must agree, so a sprite patch with the same luminance but an obvious
	//   different hue is kept.
	const HUE_TOLERANCE = 25;
	// Strict on purpose: real sprite colors (pastel flamingo pink, creamy
	// cacatoès) carry chroma ≥ ~40, while checker JPEG noise stays under
	// ~15. A pixel must be as unsaturated as the backdrop to be erased.
	const NEUTRAL_CHROMA = 16;
	const tones = backgroundTones.map((t) => {
		const { h, s, l } = rgbToHsl(t);
		const chroma = Math.max(...t) - Math.min(...t);
		return { rgb: t, h, s, l, neutral: chroma <= NEUTRAL_CHROMA };
	});

	// Live-debug log: the samples and the tones they were clustered into, so
	// a mis-detection is visible in the browser console.
	const rgb = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
	const hsl = (t: { h: number; s: number; l: number }) =>
		`h${Math.round(t.h)}° s${Math.round(t.s * 100)}% l${Math.round(t.l * 100)}%`;
	console.log(
		`[background-removal] ${w}x${h} samples: ${samples.map(rgb).join(", ")} → ` +
			`${tones.length} tone(s): ${tones.map((t) => `${rgb(t.rgb)} ${hsl(t)}`).join(", ")} ` +
			`(luminance tolerance ${tolerance}, hue tolerance ${HUE_TOLERANCE}°)`
	);

	const isBackground = (i: number): boolean => {
		if (data[i + 3] === 0) return true; // already transparent
		const p = pxAt(i);
		const { h, l } = rgbToHsl(p);
		const chroma = Math.max(...p) - Math.min(...p);
		return tones.some((t) => {
			if (Math.abs(l - t.l) > tolerance / 255) return false;
			if (chroma <= NEUTRAL_CHROMA) return true; // a grey is never a sprite color
			if (t.neutral) return false; // saturated pixel vs a grey backdrop
			return hueDistance(h, t.h) <= HUE_TOLERANCE;
		});
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

	// De-fringe: the flood-fill's frontier leaves a 1px halo of
	// anti-aliased blend pixels (bird color + backdrop). One sweep clears
	// the ones touching transparency that still read as backdrop blend —
	// chroma below twice the neutral threshold AND background luminance.
	// Bird interiors are untouched: their neighbors are opaque.
	const toClear: number[] = [];
	for (let p = 0; p < w * h; p++) {
		if (data[p * 4 + 3] === 0) continue;
		const x = p % w;
		const touchesCleared =
			(x > 0 && data[(p - 1) * 4 + 3] === 0) ||
			(x < w - 1 && data[(p + 1) * 4 + 3] === 0) ||
			(p >= w && data[(p - w) * 4 + 3] === 0) ||
			(p < w * (h - 1) && data[(p + w) * 4 + 3] === 0);
		if (!touchesCleared) continue;
		const pixel = pxAt(p * 4);
		const chroma = Math.max(...pixel) - Math.min(...pixel);
		if (chroma > NEUTRAL_CHROMA * 2) continue;
		const { l } = rgbToHsl(pixel);
		if (!tones.some((t) => Math.abs(l - t.l) <= tolerance / 255)) continue;
		toClear.push(p);
	}
	for (const p of toClear) data[p * 4 + 3] = 0;

	ctx.putImageData(cleaned, 0, 0);
	return () => ctx.putImageData(original, 0, 0);
}
