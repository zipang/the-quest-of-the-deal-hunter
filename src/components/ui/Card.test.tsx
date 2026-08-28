import { afterEach, describe, expect, test } from "bun:test";
import { Card } from "@components/ui/Card";
import { cleanup, render } from "@testing-library/react";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("Card", () => {
	test("renders a VStack div with the card class and its children", () => {
		const elt = html(
			<Card>
				<span>hello</span>
			</Card>
		);
		expect(elt.tagName).toBe("DIV");
		expect(elt.className).toContain("card");
		expect(elt.className).toContain("v-stack");
		expect(elt.querySelector("span")?.textContent).toBe("hello");
	});

	test("defaults to the accent color and base padding", () => {
		const elt = html(<Card />);
		expect(elt.style.getPropertyValue("--card-color")).toBe("var(--color-brand-accent)");
		expect(elt.getAttribute("style")).toContain("var(--space-base)");
	});

	test("resolves every theme color through the shared maps", () => {
		for (const color of [
			"default",
			"muted",
			"accent",
			"primary",
			"secondary",
			"tertiary",
			"success",
			"info",
			"warning",
			"danger"
		] as const) {
			const elt = html(<Card color={color} />);
			expect(elt.style.getPropertyValue("--card-color")).toContain(`--color-`);
			expect(elt.style.getPropertyValue("--card-color-muted")).toContain(`-muted)`);
		}
	});

	test("accepts every spacing token as padding", () => {
		for (const padding of ["none", "xs", "sm", "md", "base", "lg", "xl", "xxl"] as const) {
			const elt = html(<Card padding={padding} />);
			expect(elt.getAttribute("style")).toContain(
				padding === "none" ? "padding: 0" : `var(--space-${padding})`
			);
		}
	});

	test("inherits the VStack layout props", () => {
		const elt = html(
			<Card as="section" gap="md" stackItems="center">
				<span>hello</span>
			</Card>
		);
		expect(elt.tagName).toBe("SECTION");
		expect(elt.getAttribute("style")).toContain("gap: var(--space-md)");
		expect(elt.getAttribute("style")).toContain("justify-content: center");
	});

	test("reflects the selected state in its class", () => {
		expect(html(<Card />).className).not.toContain("card--selected");
		expect(html(<Card selected />).className).toContain("card--selected");
	});
});
