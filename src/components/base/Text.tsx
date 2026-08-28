import type { TextAlign } from "@components/base/Heading";
import { type TextColor, textColorValue } from "@components/utils/colors";
import type { FC, ReactNode } from "react";

import "./Text.css";

export type { TextAlign };

/** Font-size scale tokens from the Design System (`--font-size-*`). */
export type FontSizeToken = "xs" | "sm" | "base" | "lg" | "xl" | "display";

/** Props of the Design-System text block. */
export interface TextProps {
	/** Font-size token from the scale. @defaultValue "base" */
	size?: FontSizeToken;
	/** Color role: theme colors or `inherit` to blend with the parent.
	 *  @defaultValue "default" */
	color?: TextColor;
	/** Horizontal alignment of the text. @defaultValue inherits (left) */
	textAlign?: TextAlign;
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
export const Text: FC<TextProps> = ({ size = "base", color = "default", textAlign, children }) => (
	<p className={`text text--${size}`} style={{ color: textColorValue(color), textAlign }}>
		{children}
	</p>
);
