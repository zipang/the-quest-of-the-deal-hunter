/** Theme colors (short names) from the Design System. */
export type ThemeColor =
	| "default"
	| "muted"
	| "accent"
	| "primary"
	| "secondary"
	| "tertiary"
	| "success"
	| "info"
	| "warning"
	| "danger";

/** Maps a theme color to its CSS variable. */
export const THEME_COLORS_MAP: Record<ThemeColor, string> = {
	default: "--color-text",
	muted: "--color-text-muted",
	accent: "--color-brand-accent",
	primary: "--color-brand-primary",
	secondary: "--color-brand-secondary",
	tertiary: "--color-brand-tertiary",
	success: "--color-action-success",
	info: "--color-action-info",
	warning: "--color-action-warning",
	danger: "--color-action-danger"
};

/** Maps a theme color to its derived muted variable (hover / soft states). */
export const THEME_COLOR_MUTED_MAP: Record<ThemeColor, string> = {
	default: "--color-text-muted",
	muted: "--color-text-muted",
	accent: "--color-brand-accent-muted",
	primary: "--color-brand-primary-muted",
	secondary: "--color-brand-secondary-muted",
	tertiary: "--color-brand-tertiary-muted",
	success: "--color-action-success-muted",
	info: "--color-action-info-muted",
	warning: "--color-action-warning-muted",
	danger: "--color-action-danger-muted"
};

/**
 * Text colors: every theme color plus `inherit` to blend with the parent.
 * `inherit` is not a theme color; it only makes sense for text, so it lives
 * in this dedicated extension instead of `ThemeColor`.
 */
export type TextColor = ThemeColor | "inherit";

/**
 * Resolves a theme color to its CSS `var()` reference.
 *
 * @param color - One of the theme color short names.
 * @returns A `var(--color-*)` reference usable as a CSS color value.
 * @example
 * themeColorVar("accent") // "var(--color-brand-accent)"
 */
export const themeColorVar = (color: ThemeColor): string => `var(${THEME_COLORS_MAP[color]})`;

/**
 * Resolves a theme color to its derived muted `var()` reference.
 *
 * @param color - One of the theme color short names.
 * @returns A `var(--color-*-muted)` reference for soft states.
 * @example
 * themeColorMutedVar("accent") // "var(--color-brand-accent-muted)"
 */
export const themeColorMutedVar = (color: ThemeColor): string =>
	`var(${THEME_COLOR_MUTED_MAP[color]})`;

/**
 * Resolves a text color to its CSS color value.
 *
 * @param color - A theme color, or `inherit` to blend with the parent.
 * @returns `inherit` as-is, otherwise a `var(--color-*)` reference.
 * @example
 * textColorValue("inherit") // "inherit"
 * textColorValue("danger") // "var(--color-action-danger)"
 */
export const textColorValue = (color: TextColor): string =>
	color === "inherit" ? "inherit" : themeColorVar(color);
