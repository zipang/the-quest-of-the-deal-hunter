import type { FC } from "react";
import { useId } from "react";

import "./SpriteAnimation.css";

/** One animation inside a spritesheet. Frames are read row by row,
 *  left to right, from `from` to `to` (inclusive), as 0-based
 *  [column, row] grid coordinates. A single-frame animation has
 *  `from` equal to `to`. */
export interface SpriteSheetAnimation {
	/** First frame of the sequence. */
	from: [number, number];
	/** Last frame of the sequence. */
	to: [number, number];
	/** Playback speed in frames per second. @defaultValue 8 */
	fps?: number;
}

/** Props of the sprite animation player. */
export interface SpriteAnimationProps {
	/** URL of the spritesheet image. */
	spritesheet: string;
	/** Cell size in the sheet, e.g. "16x16" or "32x32". */
	grid: `${number}x${number}`;
	/** Named animations contained in the sheet. The sheet dimensions are
	 *  inferred from the furthest frame declared here. */
	animations?: Record<string, SpriteSheetAnimation>;
	/** Sheet dimensions, e.g. "5x5". Overrides the dimensions inferred from
	 *  `animations`; required when the sheet is larger than the furthest
	 *  declared frame (e.g. a single-frame icon inside a full sheet). */
	sheet?: `${number}x${number}`;
	/** Name of the animation to play on loop. An unknown name falls back
	 *  to the implicit "idle" animation: the first cell of the sheet.
	 *  @defaultValue "idle" */
	play?: string;
	/** Displayed size of one frame, in rem. @defaultValue 4 */
	scale?: number;
	/** Extra class, used to override the default frame size from page CSS. */
	className?: string;
	/** Accessible description of the sprite. Omit it for a decorative
	 *  sprite; the element is then hidden from assistive technology. */
	alt?: string;
}

/** Parses a "WxH" grid token into pixel dimensions. */
const parseGrid = (grid: `${number}x${number}`): [number, number] => {
	const [w, h] = grid.split("x").map(Number);
	return [w, h];
};

/** Lists every frame of an animation, row by row, left to right. */
const framesOf = (animation: SpriteSheetAnimation): [number, number][] => {
	const [fromCol, fromRow] = animation.from;
	const [toCol, toRow] = animation.to;
	const frames: [number, number][] = [];

	for (let row = fromRow; row <= toRow; row++) {
		for (let col = fromCol; col <= toCol; col++) {
			frames.push([col, row]);
		}
	}
	return frames;
};

const DEFAULT_FPS = 8;
const DEFAULT_SCALE = 4;
const IDLE_FALLBACK: SpriteSheetAnimation = { from: [0, 0], to: [0, 0] };

/**
 * Plays a looping animation cropped from a spritesheet image. The element
 * shows one grid cell at a time and steps through the cells of the selected
 * animation with a pure CSS `steps()` animation.
 *
 * @param props - Spritesheet URL, grid cell size, named animations, the
 *   animation to play, and the display scale.
 * @returns A div playing the animation as a CSS background.
 * @example
 * <SpriteAnimation
 *   spritesheet="/sprites/hero.png"
 *   grid="16x16"
 *   animations={{ idle: { from: [0, 0], to: [1, 0] }, walk: { from: [0, 1], to: [5, 1], fps: 10 } }}
 *   play="walk"
 * />
 */
export const SpriteAnimation: FC<SpriteAnimationProps> = ({
	spritesheet,
	grid,
	animations = {},
	sheet,
	play = "idle",
	scale = DEFAULT_SCALE,
	className = "",
	alt
}) => {
	const [cellW, cellH] = parseGrid(grid);
	const animation = animations[play] ?? IDLE_FALLBACK;
	const frames = framesOf(animation);
	const fps = animation.fps ?? DEFAULT_FPS;

	// Sheet dimensions come from `sheet` when given, otherwise they are
	// inferred from the furthest declared frame so that background-position
	// percentages always address the right cell.
	const inferredCols = Math.max(1, ...Object.values(animations).map((a) => a.to[0] + 1));
	const inferredRows = Math.max(1, ...Object.values(animations).map((a) => a.to[1] + 1));
	const [sheetCols, sheetRows] = sheet ? parseGrid(sheet) : [inferredCols, inferredRows];

	const name = `sprite-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
	const keyframes =
		frames.length > 1
			? `@keyframes ${name} {${frames
					.map(([col, row], i) => {
						const x = sheetCols > 1 ? (col / (sheetCols - 1)) * 100 : 0;
						const y = sheetRows > 1 ? (row / (sheetRows - 1)) * 100 : 0;
						return `${(i / frames.length) * 100}% { background-position: ${x}% ${y}%; }`;
					})
					.join("")}}`
			: "";

	const style: React.CSSProperties = {
		backgroundImage: `url(${spritesheet})`,
		backgroundSize: `${sheetCols * 100}% ${sheetRows * 100}%`,
		"--sprite-scale": scale,
		...(frames.length > 1 && { animationName: name, animationDuration: `${frames.length / fps}s` })
	};

	return (
		<div
			className={["sprite-animation", className].filter(Boolean).join(" ")}
			style={style}
			{...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
		>
			{keyframes ? <style>{keyframes}</style> : null}
		</div>
	);
};
