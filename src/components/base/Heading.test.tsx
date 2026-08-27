import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Heading } from "@components/base/Heading";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("Heading", () => {
	test("renders the native tag matching the level", () => {
		expect(html(<Heading level={1}>A</Heading>).tagName).toBe("H1");
		expect(html(<Heading level={3}>B</Heading>).tagName).toBe("H3");
	});

	test("size derives from level when omitted", () => {
		const h1Elt = html(<Heading level={1}>A</Heading>);
		expect(h1Elt.className).toBe("heading heading--display");

		const h2Elt = html(<Heading level={2}>B</Heading>);
		expect(h2Elt.className).toBe("heading heading--xl");
	});

	test("color prop resolves to token vars", () => {
		const elt = html(
			<Heading level={2} color="warning">
				W
			</Heading>
		);
		expect(elt.style.color).toBe("var(--color-action-warning)");

		const defaultElt = html(<Heading level={1}>A</Heading>);
		expect(defaultElt.style.color).toBe("var(--color-text)");
	});

	test("explicit size overrides the level default", () => {
		const elt = html(
			<Heading level={2} size="lg">
				T
			</Heading>
		);
		expect(elt.className).toBe("heading heading--lg");
	});

	test("shadow prop wires the shadow color var and class", () => {
		const elt = html(
			<Heading level={1} shadow="danger">
				PRESS START
			</Heading>
		);
		expect(elt.className).toBe("heading heading--display heading--shadow");
		expect(elt.style.getPropertyValue("--heading-shadow")).toBe(
			"var(--color-action-danger)"
		);

		const plainElt = html(<Heading level={1}>A</Heading>);
		expect(plainElt.className).toBe("heading heading--display");
		expect(plainElt.style.getPropertyValue("--heading-shadow")).toBe("");
	});
});
