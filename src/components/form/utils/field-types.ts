import type { ReactNode } from "react";

/**
 * ValidityState matches the facade renders styled messages for by default.
 * Mirrors the native `ValidityState` properties Radix `Form.Message` accepts
 * as `match` values.
 */
export type ValidationMatch =
	| "valueMissing"
	| "typeMismatch"
	| "patternMismatch"
	| "tooShort"
	| "tooLong"
	| "rangeUnderflow"
	| "rangeOverflow"
	| "stepMismatch";

/** Props shared by every field component of the form family. */
export interface FieldBaseProps {
	/** Field name; also wires label/control accessibility. */
	name: string;
	/** Visible label text. */
	label: string;
	/** Server-side error message; forces the invalid state. */
	serverError?: string;
	/** Custom texts overriding Radix's default validation messages. */
	validationMessages?: Partial<Record<ValidationMatch, ReactNode>>;
	/** Disables the control. @defaultValue false */
	disabled?: boolean;
}
