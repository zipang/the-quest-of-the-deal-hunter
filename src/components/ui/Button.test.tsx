import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import { Button } from "./Button";

afterEach(cleanup);

describe("Button", () => {
	test("renders a button with its label", () => {
		const { getByText } = render(<Button>START QUEST</Button>);
		const elt = getByText("START QUEST");
		expect(elt.tagName).toBe("BUTTON");
	});

	test("defaults to the solid accent variant", () => {
		const { container } = render(<Button>GO</Button>);
		const elt = container.querySelector(".button") as HTMLElement;
		expect(elt.className).toContain("button--solid");
		expect(elt.style.getPropertyValue("--button-color")).toBe("var(--color-brand-accent)");
	});

	test("resolves any theme color through the shared map", () => {
		const { container } = render(<Button color="danger">GO</Button>);
		const elt = container.querySelector(".button") as HTMLElement;
		expect(elt.style.getPropertyValue("--button-color")).toBe("var(--color-action-danger)");
	});

	test("applies the outline variant and full width", () => {
		const { container } = render(
			<Button fullWidth variant="outline">
				ADD ITEM
			</Button>
		);
		const elt = container.querySelector(".button");
		expect(elt?.className).toContain("button--outline");
		expect(elt?.className).toContain("button--full-width");
	});

	test("wires the click handler", () => {
		let clicked = false;
		const { getByText } = render(<Button onClick={() => (clicked = true)}>GO</Button>);
		getByText("GO").click();
		expect(clicked).toBe(true);
	});

	test("renders the disabled state", () => {
		const { container } = render(<Button disabled>GO</Button>);
		const elt = container.querySelector(".button");
		expect((elt as HTMLButtonElement).disabled).toBe(true);
		expect(elt?.className).toContain("button--disabled");
	});
});
