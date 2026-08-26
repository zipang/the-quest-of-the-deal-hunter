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
export const THEME_COLOR_VAR: Record<ThemeColor, string> = {
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
