import { type ThemeColor, themeColorVar } from "@components/utils/colors";
import type { CSSProperties, FC, ReactNode } from "react";

import "./Button.css";

export interface ButtonProps {
	/** Content of the button, usually a short uppercase label. */
	children: ReactNode;
	/**
	 * Fill style: solid background or colored outline on dark surface.
	 * @defaultValue "solid"
	 */
	variant?: "solid" | "outline";
	/**
	 * Accent color driving the fill or the outline, resolved through the
	 * shared `ThemeColor` utilities.
	 * @defaultValue "accent"
	 */
	color?: ThemeColor;
	/** Stretches the button to the full width of its container.
	 * @defaultValue false */
	fullWidth?: boolean;
	/** Disables the button and mutes its colors. @defaultValue false */
	disabled?: boolean;
	/** Click handler. Omit it for buttons handled by a parent form. */
	onClick?: () => void;
}

/**
 * Renders the arcade action button: a pixel-font uppercase label on a solid
 * neon fill or a neon outline, with a glow on hover. Use it for every
 * primary screen action; pair `variant="outline"` with `variant="solid"`
 * for secondary/primary pairs like ADD ITEM / START QUEST.
 *
 * @param props - Label, variant, accent color, sizing and click handler.
 * @returns A `<button>` styled by the Design System.
 * @example
 * <Button fullWidth onClick={startQuest}>▶ START QUEST</Button>
 */
export const Button: FC<ButtonProps> = ({
	children,
	variant = "solid",
	color = "accent",
	fullWidth = false,
	disabled = false,
	onClick
}) => (
	<button
		type="button"
		className={[
			"button",
			`button--${variant}`,
			fullWidth ? "button--full-width" : "",
			disabled ? "button--disabled" : ""
		]
			.filter(Boolean)
			.join(" ")}
		style={{ "--button-color": themeColorVar(color) } as CSSProperties}
		disabled={disabled}
		onClick={onClick}
	>
		{children}
	</button>
);
