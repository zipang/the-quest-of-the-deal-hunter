import type { FC, ReactNode } from "react";
import { THEME_COLOR_VAR, type ThemeColor } from "../utils/colors";

import "./Text.css";

/** Font-size scale tokens from the Design System (`--font-size-*`). */
export type FontSizeToken = "xs" | "sm" | "base" | "lg" | "xl" | "display";

/** Props of the Design-System text block. */
export interface TextProps {
	/** Font-size token from the scale. @defaultValue "base" */
	size?: FontSizeToken;
	/** Color role: text roles or brand/action colors. @defaultValue "default" */
	color?: ThemeColor;
	/** Content of the text block. */
	children: ReactNode;
}

/**
 * Renders a paragraph styled exclusively from the Design System typography
 * tokens. Direct usage of `<p>` is forbidden in pages; use this component.
 *
 * @param props - Optional size and color role plus the text content.
 * @returns A `<p>` element carrying the `text` class.
 * @example
 * <Text>Body copy.</Text>
 * <Text size="sm" color="muted">Secondary hint</Text>
 */
export const Text: FC<TextProps> = ({ size = "base", color = "default", children }) => (
	<p className={`text text--${size}`} style={{ color: `var(${THEME_COLOR_VAR[color]})` }}>
		{children}
	</p>
);
