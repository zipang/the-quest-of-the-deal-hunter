import { useInsideForm } from "@components/form/utils/field-context";
import { Root as RadixFormRoot } from "@radix-ui/react-form";
import {
	Range as RadixRange,
	Root as RadixRoot,
	Thumb as RadixThumb,
	Track as RadixTrack
} from "@radix-ui/react-slider";
import type { FC, ReactNode } from "react";

import "./SliderRange.css";

/** Props accepted by the `SliderRange` facade. */
export interface SliderRangeProps {
	/** Field name; wires the label and the submitted FormData entry. */
	name: string;
	/** Visible label text. */
	label: string;
	/** Lower bound of the range. @defaultValue 0 */
	min?: number;
	/** Upper bound of the range. @defaultValue 100 */
	max?: number;
	/** Stepping interval (also the visual segment size). @defaultValue 1 */
	step?: number;
	/** Controlled `[min, max]` value. */
	value?: [number, number];
	/** Uncontrolled initial `[min, max]`. @defaultValue [min, max] */
	defaultValue?: [number, number];
	/** Change callback (controlled or uncontrolled usage). */
	onValueChange?: (value: [number, number]) => void;
	/**
	 * Formats the readout; receives the current `[min, max]` tuple.
	 * @defaultValue `([min, max]) => \`${min} - ${max}\``
	 */
	format?: (value: [number, number]) => ReactNode;
	/** Server-side error message; forces the invalid state. */
	serverError?: string;
	/** Disables both thumbs. @defaultValue false */
	disabled?: boolean;
}

/**
 * Renders a complete dual-thumb range field: label with a required-marker
 * spot on the left, live formatted `[min, max]` readout on the right, and a
 * Radix slider whose selected range is styled as segmented blocks. Inside a
 * form Radix submits one hidden input per thumb, so `FormData.getAll(name)`
 * yields `[min, max]`. Used standalone it wraps itself in its own form.
 *
 * @param props - Field identity, bounds, value hooks and readout formatting.
 * @returns The slider field markup, optionally wrapped in a form root.
 * @example
 * <SliderRange
 *   name="budget"
 *   label="Budget"
 *   min={0}
 *   max={5000}
 *   step={100}
 *   format={([min, max]) => `¥${min} - ¥${max}`}
 * />
 */
export const SliderRange: FC<SliderRangeProps> = ({
	min = 0,
	max = 100,
	step = 1,
	value,
	defaultValue,
	onValueChange,
	format = ([low, high]) => `${low} - ${high}`,
	name,
	label,
	serverError,
	disabled = false
}) => {
	const insideForm = useInsideForm();
	const controlled = value !== undefined;
	const shown = (controlled ? value : (defaultValue ?? [min, max])) as [number, number];

	const handleChange = (next: number[]) => {
		const [low, high] = next;
		if (low !== undefined && high !== undefined) {
			onValueChange?.([low, high]);
		}
	};

	const slider = (
		<RadixRoot
			className="slider-range__slider"
			name={name}
			min={min}
			max={max}
			step={step}
			value={controlled ? value : undefined}
			defaultValue={controlled ? undefined : (defaultValue ?? [min, max])}
			onValueChange={handleChange}
			disabled={disabled}
			data-invalid={serverError ? true : undefined}
		>
			<RadixTrack className="slider-range__track">
				<RadixRange className="slider-range__range" />
			</RadixTrack>
			<RadixThumb className="slider-range__thumb" aria-label={`${label} minimum`} />
			<RadixThumb className="slider-range__thumb" aria-label={`${label} maximum`} />
		</RadixRoot>
	);

	const field = (
		<div className={`slider-range${serverError ? " slider-range--invalid" : ""}`}>
			<div className="slider-range__header">
				<span className="slider-range__label">{label}</span>
				<span className="slider-range__value">{format(shown)}</span>
			</div>
			{slider}
			{serverError && <span className="slider-range__message">{serverError}</span>}
		</div>
	);

	return insideForm ? field : <RadixFormRoot>{field}</RadixFormRoot>;
};
