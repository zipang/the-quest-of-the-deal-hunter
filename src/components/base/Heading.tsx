import type { CSSProperties, FC, ReactNode } from "react";
import { THEME_COLOR_VAR, type ThemeColor } from "../utils/colors";

import "./Heading.css";

/** Semantic heading levels rendered as their native tags. */
export type HeadingLevel = 1 | 2 | 3 | 4;

/** Font-size scale tokens from the Design System (`--font-size-*`). */
export type FontSizeToken = "sm" | "base" | "lg" | "xl" | "display";

/** Props of the Design-System heading. */
export interface HeadingProps {
	/** Heading semantic level; renders the matching native tag. */
	level: HeadingLevel;
	/** Font-size token from the scale; size does not derive from level.
	 *  @defaultValue depends on level (1 → "display", 2 → "xl", 3/4 → "lg") */
	size?: FontSizeToken;
	/** Color role: text roles or brand/action colors. @defaultValue "default" */
	color?: ThemeColor;
	/** Content of the heading. */
	children: ReactNode;
}

/** Maps a heading level to its fallback size token when none is given. */
const DEFAULT_SIZE: Record<HeadingLevel, FontSizeToken> = {
	1: "display",
	2: "xl",
	3: "lg",
	4: "lg"
};

/**
 * Renders a native h1–h4 element styled exclusively from the Design System
 * typography tokens. Direct usage of `<h1>`–`<h4>` is forbidden in pages;
 * use this component instead.
 *
 * @param props - Level for semantics, optional size token overriding the
 *   level default, plus the heading content.
 * @returns The native heading tag carrying the `heading` class.
 * @example
 * <Heading level={1}>The Quest of the Deal Hunter</Heading>
 * <Heading level={2} size="lg">SECTION</Heading>
 */
export const Heading: FC<HeadingProps> = ({ level, size, color = "default", children }) => {
	const Tag = `h${level}` as const;
	const sizeClass = size ?? DEFAULT_SIZE[level];
	const style: Partial<CSSProperties> = { color: `var(${THEME_COLOR_VAR[color]})` };

	return (
		<Tag className={`heading heading--${sizeClass}`} style={style}>
			{children}
		</Tag>
	);
};
