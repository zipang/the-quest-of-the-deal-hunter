import { describe, expect, test } from "bun:test";
import { buildSpacingStyle, spaceVar } from "@components/utils/spacing";

describe("spaceVar", () => {
	test("maps a token to its CSS variable", () => {
		expect(spaceVar("md")).toBe("var(--space-md)");
	});

	test('maps "none" to literal zero', () => {
		expect(spaceVar("none")).toBe("0");
	});
});

describe("buildSpacingStyle", () => {
	test("emits var() references for the requested axes", () => {
		expect(buildSpacingStyle({ margin: "md", paddingTop: "xl" })).toEqual({
			margin: "var(--space-md)",
			paddingTop: "var(--space-xl)"
		});
	});

	test("omits absent props entirely", () => {
		expect(buildSpacingStyle({ gapLess: undefined } as never)).toEqual({});
		expect(buildSpacingStyle({})).toEqual({});
	});

	test("axis shorthand targets both sides only", () => {
		const style = buildSpacingStyle({ paddingX: "sm" });
		expect(style).toEqual({ paddingInline: "var(--space-sm)" });
	});

	test("side props override broader shorthands", () => {
		const style = buildSpacingStyle({
			margin: "md",
			marginTop: "lg",
			padding: "base",
			paddingLeft: "none"
		});
		expect(style).toEqual({
			margin: "var(--space-md)",
			marginTop: "var(--space-lg)",
			padding: "var(--space-base)",
			paddingLeft: "0"
		});
	});
});
