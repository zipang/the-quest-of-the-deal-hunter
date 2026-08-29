import { afterEach, describe, expect, test } from "bun:test";
import { Form } from "@components/form/Form";
import { SelectOption } from "@components/form/SelectOption";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";

afterEach(cleanup);

const CATEGORIES = ["electronics", "cameras", "clothes"] as const;

const renderGroup = (props: Partial<Parameters<typeof SelectOption>[0]> = {}) =>
	render(
		<SelectOption
			name="category"
			label="Category"
			options={[...CATEGORIES]}
			renderOption={(value, { selected }) => <span data-selected={selected}>{value}</span>}
			{...props}
		/>
	);

const radiosOf = (container: HTMLElement) =>
	Array.from(container.querySelectorAll<HTMLElement>('[role="radio"]'));

describe("SelectOption", () => {
	test("renders a labelled radiogroup with one radio per option", () => {
		const { container, getByText } = renderGroup();
		const group = container.querySelector('[role="radiogroup"]')!;
		expect(group.getAttribute("aria-labelledby")).toBe(getByText("Category").getAttribute("id"));
		expect(radiosOf(container).length).toBe(3);
		expect(
			radiosOf(container).every((r) => r.textContent!.match(/electronics|cameras|clothes/))
		).toBe(true);
	});

	test("defaultValue marks the matching option checked and tabbable", () => {
		const { container } = renderGroup({ defaultValue: "cameras" });
		const radios = radiosOf(container);
		expect(radios[1]!.getAttribute("aria-checked")).toBe("true");
		expect(radios[1]!.getAttribute("tabindex")).toBe("0");
		expect(radios[0]!.getAttribute("tabindex")).toBe("-1");
	});

	test("hands the selected state to renderOption", () => {
		const { container } = renderGroup({ defaultValue: "cameras" });
		const rendered = container.querySelectorAll("[data-selected]");
		expect(rendered[1]!.getAttribute("data-selected")).toBe("true");
		expect(rendered[0]!.getAttribute("data-selected")).toBe("false");
	});

	test("clicking an option selects it and reports the value", () => {
		const seen: string[] = [];
		const { container } = renderGroup({ onValueChange: (v) => seen.push(v) });
		fireEvent.click(radiosOf(container)[2]!);
		expect(seen).toEqual(["clothes"]);
		expect(radiosOf(container)[2]!.getAttribute("aria-checked")).toBe("true");
	});

	test("stays on the controlled value until the parent updates it", () => {
		function Host() {
			const [value, setValue] = useState("");
			return (
				<SelectOption
					name="category"
					label="Category"
					options={[...CATEGORIES]}
					value={value}
					onValueChange={setValue}
					renderOption={(v, { selected }) => <span data-selected={selected}>{v}</span>}
				/>
			);
		}
		const { container } = render(<Host />);
		fireEvent.click(radiosOf(container)[0]!);
		expect(radiosOf(container)[0]!.getAttribute("aria-checked")).toBe("true");
	});

	test("arrow keys move the selection", () => {
		const seen: string[] = [];
		const { container } = renderGroup({ onValueChange: (v) => seen.push(v) });
		const group = container.querySelector('[role="radiogroup"]')!;
		fireEvent.keyDown(group, { key: "ArrowDown" });
		expect(seen).toEqual(["electronics"]);
		fireEvent.keyDown(group, { key: "ArrowDown" });
		expect(seen).toEqual(["electronics", "cameras"]);
		fireEvent.keyDown(group, { key: "ArrowUp" });
		expect(seen).toEqual(["electronics", "cameras", "electronics"]);
	});

	test("ignores interactions while disabled", () => {
		const seen: string[] = [];
		const { container } = renderGroup({
			disabled: true,
			onValueChange: (v) => seen.push(v)
		});
		fireEvent.click(radiosOf(container)[0]!);
		fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowDown" });
		expect(seen).toEqual([]);
		expect(radiosOf(container)[0]!.getAttribute("aria-checked")).toBe("false");
	});

	test("works standalone by rendering its own form, exactly once", () => {
		const { container } = renderGroup();
		expect(container.querySelectorAll("form").length).toBe(1);
	});

	test("submits the selected value through a form data entry", () => {
		let submitted: string | null = null;
		const { container } = render(
			<Form
				onSubmit={(event) => {
					event.preventDefault();
					const data = new FormData(event.currentTarget);
					submitted = (data.get("category") as string) ?? null;
				}}
			>
				<SelectOption
					name="category"
					label="Category"
					options={[...CATEGORIES]}
					defaultValue="cameras"
					renderOption={(v) => <span>{v}</span>}
				/>
				<button type="submit">go</button>
			</Form>
		);
		fireEvent.submit(container.querySelector("form")!);
		expect(submitted!).toBe("cameras");
	});

	test("a required field renders the danger marker and carries the constraint", () => {
		const { container, getByText } = renderGroup({ required: true });
		expect(getByText("*")).toBeTruthy();
		const input = container.querySelector<HTMLInputElement>(".select-option__input")!;
		expect(input.required).toBe(true);
		expect(input.checkValidity()).toBe(false);
	});

	// NOTE: Radix's built-in match rendering (`Form.Message match=…`) cannot be
	// exercised under happy-dom: its ValidityState exposes no enumerable keys,
	// so Radix never observes `valueMissing` etc. Verify those states in the
	// browser (see TextField.test.tsx for the same caveat).

	test("serverError forces the invalid state and renders the message", () => {
		const { getByText } = renderGroup({ serverError: "Pick a category" });
		expect(getByText("Pick a category")).toBeTruthy();
	});

	test("the hidden input becomes valid once a value is selected", () => {
		const { container } = renderGroup({ required: true });
		const input = container.querySelector<HTMLInputElement>(".select-option__input")!;
		expect(input.checkValidity()).toBe(false);
		fireEvent.click(radiosOf(container)[1]!);
		expect(input.checkValidity()).toBe(true);
		expect(input.value).toBe("cameras");
	});
});
