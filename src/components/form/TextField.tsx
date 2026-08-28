import { useInsideForm } from "@components/form/utils/field-context";
import type { FieldBaseProps, ValidationMatch } from "@components/form/utils/field-types";
import {
	Control as RadixControl,
	Field as RadixField,
	Label as RadixLabel,
	Message as RadixMessage,
	Root as RadixRoot
} from "@radix-ui/react-form";
import type { FC } from "react";

import "./TextField.css";

/** Text-like input types accepted by `TextField` (no date/number/file). */
export type TextFieldType = "text" | "email" | "password" | "search" | "tel" | "url";

/** Matches the facade renders a message for by default, in this order. */
const DEFAULT_MATCHES: ValidationMatch[] = [
	"valueMissing",
	"typeMismatch",
	"patternMismatch",
	"tooShort",
	"tooLong"
];

export interface TextFieldProps extends FieldBaseProps {
	/** Input type. @defaultValue "text" */
	type?: TextFieldType;
	/** Controlled value. */
	value?: string;
	/** Uncontrolled initial value. @defaultValue "" */
	defaultValue?: string;
	/** Change callback (controlled or uncontrolled usage). */
	onValueChange?: (value: string) => void;
	/** Placeholder text shown inside the empty control. */
	placeholder?: string;
	/** Makes the field mandatory (native constraint). @defaultValue false */
	required?: boolean;
	/** Minimum length (native constraint). */
	minLength?: number;
	/** Maximum length (native constraint). */
	maxLength?: number;
	/** Pattern the value must match (native constraint). */
	pattern?: string;
	/** Native autocomplete hint. */
	autoComplete?: string;
}

/**
 * Renders a complete labelled text field: Radix `Form.Field` + label with a
 * required marker + styled input + validation messages. Used standalone it
 * wraps itself in its own `Form`; inside a `Form` it reuses the parent form
 * element. Validation rules come from the native constraint attributes.
 *
 * @param props - Field identity, label, constraints and value hooks.
 * @returns The field markup, optionally wrapped in a `Form.Root`.
 * @example
 * <TextField name="title" label="Item" required placeholder="Nikon F3…" />
 */
export const TextField: FC<TextFieldProps> = ({
	type = "text",
	value,
	defaultValue,
	onValueChange,
	placeholder,
	required = false,
	minLength,
	maxLength,
	pattern,
	autoComplete,
	name,
	label,
	serverError,
	validationMessages = {},
	disabled = false
}) => {
	const insideForm = useInsideForm();
	const controlled = value !== undefined;

	// Forwards the DOM change to `onValueChange`, keeping the facade free of
	// raw change-event plumbing for consumers.
	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		onValueChange?.(event.target.value);
	};

	const field = (
		<RadixField className="text-field" name={name} serverInvalid={!!serverError}>
			<RadixLabel className="text-field__label">
				{label}
				{required && (
					<span className="text-field__required" aria-hidden="true">
						*
					</span>
				)}
			</RadixLabel>
			<RadixControl asChild>
				<input
					className="text-field__control"
					type={type}
					value={controlled ? value : undefined}
					defaultValue={controlled ? undefined : defaultValue}
					onChange={handleChange}
					placeholder={placeholder}
					required={required}
					minLength={minLength}
					maxLength={maxLength}
					pattern={pattern}
					autoComplete={autoComplete}
					disabled={disabled}
				/>
			</RadixControl>
			{DEFAULT_MATCHES.map((match) => (
				<RadixMessage key={match} className="text-field__message" match={match}>
					{validationMessages[match]}
				</RadixMessage>
			))}
			{serverError && (
				<RadixMessage className="text-field__message" forceMatch>
					{serverError}
				</RadixMessage>
			)}
		</RadixField>
	);

	return insideForm ? field : <RadixRoot>{field}</RadixRoot>;
};
