import { afterEach, describe, expect, test } from "bun:test";
import { Form } from "@components/form/Form";
import { SliderRange } from "@components/form/SliderRange";
import { cleanup, fireEvent, render } from "@testing-library/react";

afterEach(cleanup);

const getThumbs = (container: HTMLElement) =>
	Array.from(container.querySelectorAll<HTMLElement>(".slider-range__thumb"));

describe("SliderRange", () => {
	test("renders the label and the default raw readout", () => {
		const { container, getByText } = render(
			<SliderRange name="budget" label="Budget" min={0} max={100} />
		);
		expect(getByText("Budget")).toBeTruthy();
		expect(getByText("0 - 100")).toBeTruthy();
		expect(getThumbs(container).length).toBe(2);
	});

	test("renders the formatted readout for the current value", () => {
		const { getByText } = render(
			<SliderRange
				name="budget"
				label="Budget"
				value={[800, 2500]}
				format={([min, max]) => `¥${min} - ¥${max}`}
			/>
		);
		expect(getByText("¥800 - ¥2500")).toBeTruthy();
	});

	test("uncontrolled usage reports the tuple through onValueChange", () => {
		let latest: [number, number] | undefined;
		const { container } = render(
			<SliderRange
				name="n"
				label="N"
				min={0}
				max={100}
				onValueChange={(value) => (latest = value)}
			/>
		);
		const control = getThumbs(container).at(1);
		expect(control).toBeDefined();
		if (!control) return;

		// Radix handles keys on the focused thumb only.
		control.focus();
		fireEvent.keyDown(control, { key: "ArrowLeft" });
		expect(latest).toEqual([0, 99]);
	});

	test("controlled usage renders the given bounds", () => {
		const { container, getByText } = render(
			<SliderRange name="n" label="N" value={[10, 90]} format={([min]) => `${min}`} />
		);
		expect(getByText("10")).toBeTruthy();
		expect(getThumbs(container)[0]).toBeTruthy();
	});

	test("standalone usage renders exactly one form element", () => {
		const { container } = render(<SliderRange name="n" label="N" />);
		expect(container.querySelectorAll("form").length).toBe(1);
	});

	test("inside a Form no extra form element is nested", () => {
		const { container } = render(
			<Form>
				<SliderRange name="n" label="N" />
			</Form>
		);
		expect(container.querySelectorAll("form").length).toBe(1);
	});

	test("inside a Form the slider submits bubble inputs named `budget[]`", () => {
		const { container } = render(
			<Form>
				<SliderRange name="budget" label="Budget" />
			</Form>
		);
		// Radix renders one hidden input per thumb and appends `[]` to the
		// name, so FormData.getAll("budget[]") yields [min, max].
		const named = container.querySelectorAll('input[name="budget[]"]');
		expect(named.length).toBe(2);
	});

	test("serverError forces the invalid state and renders the message", () => {
		const { getByText } = render(<SliderRange name="n" label="N" serverError="Budget too wide" />);
		expect(getByText("Budget too wide")).toBeTruthy();
	});

	test("disabled usage marks thumbs disabled", () => {
		const { container } = render(<SliderRange name="n" label="N" disabled />);
		for (const thumb of getThumbs(container)) {
			expect(thumb.hasAttribute("data-disabled")).toBe(true);
		}
	});
});
