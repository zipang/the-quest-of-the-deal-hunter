import { afterEach, describe, expect, test } from "bun:test";
import { Form } from "@components/form/Form";
import { TextField } from "@components/form/TextField";
import { cleanup, fireEvent, render } from "@testing-library/react";

afterEach(cleanup);

describe("TextField", () => {
	test("associates label and control and renders required marker", () => {
		const { getByLabelText, getByText } = render(<TextField name="title" label="Item" required />);
		const control = getByLabelText(/Item/) as HTMLInputElement;
		expect(control.tagName).toBe("INPUT");
		expect(control.required).toBe(true);
		expect(getByText("*")).toBeTruthy();
	});

	test("forwards native constraint attributes to the input", () => {
		const { getByLabelText } = render(
			<TextField
				name="email"
				label="Email"
				type="email"
				minLength={3}
				maxLength={40}
				pattern=".+@.+$"
				placeholder="you@example.com"
			/>
		);
		const control = getByLabelText(/Email/) as HTMLInputElement;
		expect(control.type).toBe("email");
		expect(control.minLength).toBe(3);
		expect(control.maxLength).toBe(40);
		expect(control.pattern).toBe(".+@.+$");
		expect(control.placeholder).toBe("you@example.com");
	});

	test("standalone usage renders exactly one form element", () => {
		const { container } = render(<TextField name="a" label="A" />);
		expect(container.querySelectorAll("form").length).toBe(1);
	});

	test("inside a Form no extra form element is nested", () => {
		const { container } = render(
			<Form>
				<TextField name="a" label="A" />
				<TextField name="b" label="B" />
			</Form>
		);
		expect(container.querySelectorAll("form").length).toBe(1);
	});

	test("uncontrolled usage reports changes through onValueChange", () => {
		let latest = "";
		const { getByLabelText } = render(
			<TextField name="a" label="A" onValueChange={(value) => (latest = value)} />
		);
		fireEvent.change(getByLabelText(/A/), { target: { value: "Nikon" } });
		expect(latest).toBe("Nikon");
	});

	test("controlled usage renders the given value", () => {
		const { getByLabelText } = render(<TextField name="a" label="A" value="fixed" />);
		expect((getByLabelText(/A/) as HTMLInputElement).value).toBe("fixed");
	});

	test("serverError forces the invalid state and renders the message", () => {
		const { getByLabelText, getByText } = render(
			<TextField name="a" label="A" serverError="Already taken" />
		);
		const field = getByLabelText(/A/).closest(".text-field") as HTMLElement;
		expect(field.getAttribute("data-invalid")).toBe("true");
		expect(getByText("Already taken")).toBeTruthy();
	});

	// NOTE: Radix's built-in match rendering (`Form.Message match=…`) cannot be
	// exercised under happy-dom: its ValidityState exposes no enumerable keys,
	// so Radix never observes `valueMissing` etc. Verify those states in the
	// browser (see plan risk "happy-dom constraint-validation gaps").
});
