import { useInsideForm } from "@components/form/utils/field-context";
import type { FieldBaseProps, ValidationMatch } from "@components/form/utils/field-types";
import {
	Control as RadixControl,
	Field as RadixField,
	Label as RadixLabel,
	Message as RadixMessage,
	Root as RadixRoot
} from "@radix-ui/react-form";
import type { ChangeEvent, FC } from "react";

import "./NumberField.css";

/** Matches the facade renders a message for by default, in this order. */
const DEFAULT_MATCHES: ValidationMatch[] = [
	"valueMissing",
	"rangeUnderflow",
	"rangeOverflow",
	"stepMismatch"
];

/** Props accepted by the `NumberField` facade. */
export interface NumberFieldProps extends FieldBaseProps {
	/** Controlled numeric value; `undefined` = empty field. */
	value?: number;
	/** Uncontrolled initial value. @defaultValue undefined */
	defaultValue?: number;
	/** Change callback; empty or unparseable input yields `undefined`. */
	onValueChange?: (value: number | undefined) => void;
	/** Placeholder text shown inside the empty control. @defaultValue "0" */
	placeholder?: string;
	/** Makes the field mandatory (native constraint). @defaultValue false */
	required?: boolean;
	/** Minimum value (native constraint). */
	min?: number;
	/** Maximum value (native constraint). */
	max?: number;
	/** Increment/decrement step (native constraint). */
	step?: number;
	/**
	 * Maximum number of decimal places allowed. Values reported through
	 * `onValueChange` are rounded to this precision, and `step` defaults to
	 * `10 ** -decimals` when `step` itself is not provided.
	 * @defaultValue 0 (integers only)
	 */
	decimals?: number;
}

/**
 * Rounds a value to the allowed decimal precision.
 *
 * @param value - Parsed numeric input.
 * @param decimals - Maximum decimal places.
 * @returns The rounded value.
 */
const roundTo = (value: number, decimals: number): number => Number(value.toFixed(decimals));

/**
 * Renders a complete labelled numeric field: Radix `Form.Field` + label with a
 * required marker + `type="number"` control (native spinner hidden by CSS) +
 * validation messages. Numeric semantics hide string parsing from consumers:
 * `onValueChange` reports `number | undefined`. Used standalone it wraps
 * itself in its own `Form`; inside a `Form` it reuses the parent form element.
 *
 * @param props - Field identity, label, numeric constraints and value hooks.
 * @returns The field markup, optionally wrapped in a `Form.Root`.
 * @example
 * <NumberField name="budget" label="Budget" min={0} step={100} />
 */
export const NumberField: FC<NumberFieldProps> = ({
	value,
	defaultValue,
	onValueChange,
	placeholder = "0",
	required = false,
	min,
	max,
	step,
	decimals = 0,
	name,
	label,
	serverError,
	validationMessages = {},
	disabled = false
}) => {
	const insideForm = useInsideForm();
	const controlled = value !== undefined;
	// Explicit `step` wins; otherwise it derives from the decimal precision.
	const effectiveStep = step ?? (decimals > 0 ? 10 ** -decimals : undefined);

	// Parses the DOM input at the boundary so consumers receive numbers (or
	// `undefined` for an empty field) rounded to the allowed precision.
	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value;
		if (raw === "") {
			onValueChange?.(undefined);
			return;
		}
		const parsed = Number.parseFloat(raw);
		onValueChange?.(Number.isNaN(parsed) ? undefined : roundTo(parsed, decimals));
	};

	const field = (
		<RadixField className="number-field" name={name} serverInvalid={!!serverError}>
			<RadixLabel className="number-field__label">
				{label}
				{required && (
					<span className="number-field__required" aria-hidden="true">
						*
					</span>
				)}
			</RadixLabel>
			<RadixControl asChild>
				<input
					className="number-field__control"
					type="number"
					inputMode={decimals > 0 ? "decimal" : "numeric"}
					value={controlled ? value.toString() : undefined}
					defaultValue={controlled ? undefined : defaultValue?.toString()}
					onChange={handleChange}
					placeholder={placeholder}
					required={required}
					min={min}
					max={max}
					step={effectiveStep}
					disabled={disabled}
				/>
			</RadixControl>
			{DEFAULT_MATCHES.map((match) => (
				<RadixMessage key={match} className="number-field__message" match={match}>
					{validationMessages[match]}
				</RadixMessage>
			))}
			{serverError && (
				<RadixMessage className="number-field__message" forceMatch>
					{serverError}
				</RadixMessage>
			)}
		</RadixField>
	);

	return insideForm ? field : <RadixRoot>{field}</RadixRoot>;
};
