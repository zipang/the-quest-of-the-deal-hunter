import { afterEach, describe, expect, test } from "bun:test";
import { Form } from "@components/form/Form";
import { useInsideForm } from "@components/form/utils/field-context";
import { cleanup, render } from "@testing-library/react";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

const Probe = () => <span data-inside={useInsideForm() ? "yes" : "no"} />;

describe("Form", () => {
	test("renders a single form element with the form class", () => {
		const elt = html(
			<Form>
				<Probe />
			</Form>
		);
		expect(elt.tagName).toBe("FORM");
		expect(elt.className).toBe("form");
		expect(elt.querySelectorAll("form").length).toBe(0);
	});

	test("children are marked as inside a form", () => {
		const elt = html(
			<Form>
				<Probe />
			</Form>
		);
		expect(elt.querySelector("[data-inside]")?.getAttribute("data-inside")).toBe("yes");
	});

	test("standalone probes are outside a form", () => {
		const { container } = render(<Probe />);
		expect(container.querySelector("[data-inside]")?.getAttribute("data-inside")).toBe("no");
	});
});
