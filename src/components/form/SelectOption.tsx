import { useInsideForm } from "@components/form/utils/field-context";
import type { FieldBaseProps, ValidationMatch } from "@components/form/utils/field-types";
import {
	Control as RadixControl,
	Field as RadixField,
	Label as RadixLabel,
	Message as RadixMessage,
	Root as RadixRoot
} from "@radix-ui/react-form";
import type { FC, KeyboardEvent, ReactNode } from "react";
import { useId, useState } from "react";

import "./SelectOption.css";

/** Props accepted by the `SelectOption` facade. */
export interface SelectOptionProps extends FieldBaseProps {
	/** Option values, in display order. */
	options: string[];
	/**
	 * Renders the visual of one option; `selected` reflects the current
	 * selection so the consumer can highlight it (typically via `Card`).
	 */
	renderOption: (value: string, state: { selected: boolean }) => ReactNode;
	/** Controlled selected value. */
	value?: string;
	/** Uncontrolled initial value. @defaultValue "" (nothing selected) */
	defaultValue?: string;
	/** Change callback with the newly selected value. */
	onValueChange?: (value: string) => void;
	/** Makes the field mandatory (blocks submit when nothing is selected). @defaultValue false */
	required?: boolean;
}

/** Matches the facade renders a message for by default, in this order. */
const DEFAULT_MATCHES: ValidationMatch[] = ["valueMissing"];

/**
 * Renders a single-selection group of clickable options as a complete field:
 * label with a required marker, an ARIA `radiogroup` whose options come from
 * `renderOption` (no native `<select>` — any React node can be an option),
 * and validation messages. Selection is keyboard-navigable (arrow keys,
 * Space/Enter) and submitted with the form through a visually hidden input.
 * Used standalone it wraps itself in its own `Form`; inside a `Form` it
 * reuses the parent form element.
 *
 * @param props - Field identity, option values, option renderer, value hooks.
 * @returns The field markup, optionally wrapped in a form root.
 * @example
 * <SelectOption
 *   name="category"
 *   label="Category"
 *   options={["electronics", "cameras"]}
 *   renderOption={(value, { selected }) => (
 *     <Card color="brand-secondary" selected={selected}>{value}</Card>
 *   )}
 * />
 */
export const SelectOption: FC<SelectOptionProps> = ({
	options,
	renderOption,
	value,
	defaultValue = "",
	onValueChange,
	required = false,
	name,
	label,
	serverError,
	validationMessages = {},
	disabled = false
}) => {
	const insideForm = useInsideForm();
	const labelId = useId();
	const controlled = value !== undefined;
	const [internalValue, setInternalValue] = useState<string>(defaultValue);
	const shown = controlled ? value : internalValue;
	const optionElts: (HTMLDivElement | null)[] = [];

	// Commits a new selection in both usages, ignoring events while disabled.
	const select = (next: string, index: number) => {
		if (disabled || next === shown) {
			return;
		}
		if (!controlled) {
			setInternalValue(next);
		}
		onValueChange?.(next);
		optionElts[index]?.focus();
	};

	// Arrow keys walk the group with wrapping, like a native radio group.
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
		if (disabled || !keys.includes(event.key)) {
			return;
		}
		event.preventDefault();
		const current = options.indexOf(shown);
		const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
		const nextIndex = (current + step + options.length) % options.length;
		const nextValue = options[nextIndex] ?? shown;
		select(nextValue, nextIndex);
	};

	const radios = options.map((optionValue, index) => {
		const selected = optionValue === shown;
		// Roving tabindex: the selection is tabbable, or the first option when
		// nothing is selected yet.
		const tabbable = selected || (shown === "" && index === 0);
		const optionProps: React.ComponentPropsWithoutRef<"div"> & { "data-selected"?: boolean } = {
			className: "select-option__option",
			// A native `<input type="radio">` cannot wrap arbitrary React nodes;
			// the ARIA radiogroup pattern is a deliberate design decision (see
			// tasks/spec-card-select-option.md, AD2).
			// biome-ignore lint/a11y/useSemanticElements: custom option visuals
			role: "radio",
			"aria-checked": selected,
			tabIndex: tabbable && !disabled ? 0 : -1,
			"aria-disabled": disabled || undefined,
			"data-selected": selected || undefined,
			onClick: () => select(optionValue, index),
			onKeyDown: (event) => {
				// Space/Enter commit the focused option, per the radio pattern.
				if (event.key === " " || event.key === "Enter") {
					event.preventDefault();
					select(optionValue, index);
				}
			}
		};
		return (
			<div
				key={optionValue}
				ref={(elt) => {
					optionElts[index] = elt;
				}}
				{...optionProps}
			>
				{renderOption(optionValue, { selected })}
			</div>
		);
	});

	const field = (
		<RadixField className="select-option" name={name} serverInvalid={!!serverError}>
			<RadixLabel className="select-option__label" id={labelId} htmlFor={`select-option-${name}`}>
				{label}
				{required && (
					<span className="select-option__required" aria-hidden="true">
						*
					</span>
				)}
			</RadixLabel>
			{/* The real form participant: hidden from users, validated natively
			    (a `type="hidden"` input would be barred from constraints). */}
			<RadixControl asChild>
				<input
					className="select-option__input"
					type="text"
					value={shown}
					onChange={() => {}}
					required={required}
					disabled={disabled}
					tabIndex={-1}
					aria-hidden="true"
				/>
			</RadixControl>
			<div
				className={`select-option__group${disabled ? " select-option__group--disabled" : ""}`}
				id={`select-option-${name}`}
				role="radiogroup"
				aria-labelledby={labelId}
				aria-required={required || undefined}
				onKeyDown={handleKeyDown}
			>
				{radios}
			</div>
			{DEFAULT_MATCHES.map((match) => (
				<RadixMessage key={match} className="select-option__message" match={match}>
					{validationMessages[match]}
				</RadixMessage>
			))}
			{serverError && (
				<RadixMessage className="select-option__message" forceMatch>
					{serverError}
				</RadixMessage>
			)}
		</RadixField>
	);

	return insideForm ? field : <RadixRoot>{field}</RadixRoot>;
};
