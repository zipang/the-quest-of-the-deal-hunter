import { describe, expect, test } from "bun:test";
import {
	THEME_COLORS_MAP,
	type ThemeColor,
	textColorValue,
	themeColorMutedVar,
	themeColorVar
} from "@components/utils/colors";

describe("colors utilities", () => {
	test("themeColorVar resolves short names to their token vars", () => {
		expect(themeColorVar("accent")).toBe("var(--color-brand-accent)");
		expect(themeColorVar("default")).toBe("var(--color-text)");
		expect(themeColorVar("danger")).toBe("var(--color-action-danger)");
	});

	test("themeColorMutedVar resolves the derived muted variants", () => {
		expect(themeColorMutedVar("accent")).toBe("var(--color-brand-accent-muted)");
		// Text roles have no derived variant: the muted text token is used.
		expect(themeColorMutedVar("default")).toBe("var(--color-text-muted)");
		expect(themeColorMutedVar("muted")).toBe("var(--color-text-muted)");
	});

	test("textColorValue passes inherit through and resolves theme colors", () => {
		expect(textColorValue("inherit")).toBe("inherit");
		expect(textColorValue("muted")).toBe("var(--color-text-muted)");
	});

	test("every theme color maps to a --color-* variable", () => {
		for (const color of Object.keys(THEME_COLORS_MAP) as ThemeColor[]) {
			expect(THEME_COLORS_MAP[color]).toMatch(/^--color-/);
		}
	});
});
