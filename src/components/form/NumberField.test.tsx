import { afterEach, describe, expect, test } from "bun:test";
import { Form } from "@components/form/Form";
import { NumberField } from "@components/form/NumberField";
import { cleanup, fireEvent, render } from "@testing-library/react";

afterEach(cleanup);

describe("NumberField", () => {
	test("renders a numeric input associated with its label", () => {
		const { getByLabelText } = render(<NumberField name="budget" label="Budget" />);
		const control = getByLabelText(/Budget/) as HTMLInputElement;
		expect(control.tagName).toBe("INPUT");
		expect(control.type).toBe("number");
		expect(control.placeholder).toBe("0");
	});

	test("forwards native numeric constraints to the input", () => {
		const { getByLabelText } = render(
			<NumberField name="n" label="N" min={0} max={1000} step={100} required />
		);
		const control = getByLabelText(/N/) as HTMLInputElement;
		expect(control.min).toBe("0");
		expect(control.max).toBe("1000");
		expect(control.step).toBe("100");
		expect(control.required).toBe(true);
	});

	test("derives step from decimals when step is not provided", () => {
		const { getByLabelText } = render(<NumberField name="n" label="N" decimals={2} />);
		expect((getByLabelText(/N/) as HTMLInputElement).step).toBe("0.01");
	});

	test("reports numbers through onValueChange, undefined when emptied", () => {
		let latest: number | undefined;
		const { getByLabelText } = render(
			<NumberField name="n" label="N" onValueChange={(value) => (latest = value)} />
		);
		const control = getByLabelText(/N/);
		fireEvent.change(control, { target: { value: "250" } });
		expect(latest).toBe(250);
		fireEvent.change(control, { target: { value: "" } });
		expect(latest).toBeUndefined();
	});

	test("rounds reported values to the allowed decimals", () => {
		let latest: number | undefined;
		const { getByLabelText } = render(
			<NumberField name="n" label="N" decimals={2} onValueChange={(value) => (latest = value)} />
		);
		fireEvent.change(getByLabelText(/N/), { target: { value: "1.239" } });
		expect(latest).toBe(1.24);
	});

	test("controlled usage renders the given value", () => {
		const { getByLabelText } = render(<NumberField name="n" label="N" value={42} />);
		expect((getByLabelText(/N/) as HTMLInputElement).value).toBe("42");
	});

	test("standalone usage renders exactly one form element", () => {
		const { container } = render(<NumberField name="n" label="N" />);
		expect(container.querySelectorAll("form").length).toBe(1);
	});

	test("inside a Form no extra form element is nested", () => {
		const { container } = render(
			<Form>
				<NumberField name="n" label="N" />
			</Form>
		);
		expect(container.querySelectorAll("form").length).toBe(1);
	});

	test("serverError forces the invalid state and renders the message", () => {
		const { getByLabelText, getByText } = render(
			<NumberField name="n" label="N" serverError="Out of budget" />
		);
		const field = getByLabelText(/N/).closest(".number-field") as HTMLElement;
		expect(field.getAttribute("data-invalid")).toBe("true");
		expect(getByText("Out of budget")).toBeTruthy();
	});
});
