import type { CSSProperties } from "react";

/**
 * Spacing scale tokens defined in `src/styles/theme.css`.
 * Use token names only — raw CSS values are rejected at compile time so
 * DESIGN.md and theme.css stay authoritative.
 */
export type SpaceToken = "none" | "xs" | "sm" | "md" | "base" | "lg" | "xl" | "xxl";

/** Props for the four box sides at once (margin, padding). */
export interface BoxAllProps {
	/** Space on every side. @defaultValue none (unset) */
	margin?: SpaceToken;
	/** Inner space on every side. @defaultValue none (unset) */
	padding?: SpaceToken;
}

/** Props targeting one axis of the box. */
interface BoxAxisProps {
	/** Horizontal margin shorthand (left + right). @defaultValue none (unset) */
	marginX?: SpaceToken;
	/** Vertical margin shorthand (top + bottom). @defaultValue none (unset) */
	marginY?: SpaceToken;
	/** Horizontal inner space shorthand (left + right). @defaultValue none (unset) */
	paddingX?: SpaceToken;
	/** Vertical inner space shorthand (top + bottom). @defaultValue none (unset) */
	paddingY?: SpaceToken;
}

/** Props targeting one single side of the box. */
interface BoxSideProps {
	/** Space above. @defaultValue none (unset) */
	marginTop?: SpaceToken;
	/** Space to the right. @defaultValue none (unset) */
	marginRight?: SpaceToken;
	/** Space below. @defaultValue none (unset) */
	marginBottom?: SpaceToken;
	/** Space to the left. @defaultValue none (unset) */
	marginLeft?: SpaceToken;
	/** Inner space above. @defaultValue none (unset) */
	paddingTop?: SpaceToken;
	/** Inner space to the right. @defaultValue none (unset) */
	paddingRight?: SpaceToken;
	/** Inner space below. @defaultValue none (unset) */
	paddingBottom?: SpaceToken;
	/** Inner space to the left. @defaultValue none (unset) */
	paddingLeft?: SpaceToken;
}

/**
 * Full spacing API shared by layout components: an all-sides shortcut plus
 * per-axis and per-side overrides. More specific props win over broader ones
 * (`paddingTop` beats `paddingY` beats `padding`).
 */
export interface SpacingProps extends BoxAllProps, BoxAxisProps, BoxSideProps {}

/** Props controlling the space between children of a layout container. */
export interface GapProps {
	/** Space between children. @defaultValue base (set by each component) */
	gap?: SpaceToken;
}

/**
 * Converts a spacing token into its CSS value.
 *
 * @param token - One of the theme spacing tokens.
 * @returns `"0"` for `"none"`, otherwise a `var(--space-*)` reference.
 * @example
 * spaceVar("md") // "var(--space-md)"
 * spaceVar("none") // "0"
 */
export const spaceVar = (token: SpaceToken): string =>
	token === "none" ? "0" : `var(--space-${token})`;

/** A spacing prop name together with the CSS property it targets. */
type Axis = { prop: keyof SpacingProps; cssProperty: string };

/**
 * All spacing props, ordered from broadest to most specific so that more
 * specific values overwrite broader ones inside the produced style object.
 */
const AXES: Axis[] = [
	{ prop: "margin", cssProperty: "margin" },
	{ prop: "marginX", cssProperty: "marginInline" },
	{ prop: "marginY", cssProperty: "marginBlock" },
	{ prop: "marginTop", cssProperty: "marginTop" },
	{ prop: "marginRight", cssProperty: "marginRight" },
	{ prop: "marginBottom", cssProperty: "marginBottom" },
	{ prop: "marginLeft", cssProperty: "marginLeft" },
	{ prop: "padding", cssProperty: "padding" },
	{ prop: "paddingX", cssProperty: "paddingInline" },
	{ prop: "paddingY", cssProperty: "paddingBlock" },
	{ prop: "paddingTop", cssProperty: "paddingTop" },
	{ prop: "paddingRight", cssProperty: "paddingRight" },
	{ prop: "paddingBottom", cssProperty: "paddingBottom" },
	{ prop: "paddingLeft", cssProperty: "paddingLeft" }
];

/**
 * Builds the inline style object from spacing props.
 *
 * @param props - Any subset of `SpacingProps`; absent props emit nothing.
 * @returns A partial `CSSProperties` containing only the requested spacings,
 *   every value being `0` or a `var(--space-*)` reference.
 * @example
 * buildSpacingStyle({ margin: "md", paddingTop: "xl" })
 * // { margin: "var(--space-md)", paddingTop: "var(--space-xl)" }
 */
export const buildSpacingStyle = (props: SpacingProps): Partial<CSSProperties> => {
	const style: Record<string, string> = {};

	// Apply axes broadest-first so specific side overrides come last and win.
	for (const { prop, cssProperty } of AXES) {
		const token = props[prop];
		if (!token) continue;
		style[cssProperty] = spaceVar(token);
	}
	return style as Partial<CSSProperties>;
};
