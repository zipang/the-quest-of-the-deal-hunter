import { VStack, type VStackProps } from "@components/layout/VStack";
import { type ThemeColor, themeColorMutedVar, themeColorVar } from "@components/utils/colors";
import type { CSSProperties, FC } from "react";

import "./Card.css";

export interface CardProps extends VStackProps {
	/**
	 * Accent color driving the card edge and selected tint, resolved through
	 * the shared `ThemeColor` utilities.
	 * @defaultValue "accent"
	 */
	color?: ThemeColor;
	/**
	 * Highlights the card with a full-width colored edge, tinted background
	 * and elevation glow.
	 * @defaultValue false
	 */
	selected?: boolean;
}

/**
 * Renders a themed surface block with a 1 px colored edge; when selected the
 * edge goes full color, the background gets a tint of the same color and the
 * card glows. Purely presentational: pair it with `SelectOption` (or any
 * click handler) to build selectable option lists.
 *
 * Layout is inherited from `VStack`: children stack vertically and every
 * spacing token (`padding`, `margin`, `gap`, …) plus alignment props apply.
 * For horizontal rows inside a card, nest an `HStack`.
 *
 * @param props - Accent color, selected state, VStack layout props and content.
 * @returns The card markup.
 * @example
 * <Card color="secondary" selected padding="lg" gap="sm">
 *   📷 Cameras
 * </Card>
 */
export const Card: FC<CardProps> = ({
	color = "accent",
	selected = false,
	padding = "base",
	className = "",
	children,
	...layout
}) => {
	const classes = ["card", selected ? "card--selected" : "", className].filter(Boolean).join(" ");

	const accentStyle = {
		"--card-color": themeColorVar(color),
		"--card-color-muted": themeColorMutedVar(color)
	} as CSSProperties;

	return (
		<VStack {...layout} padding={padding} className={classes} style={accentStyle}>
			{children}
		</VStack>
	);
};
