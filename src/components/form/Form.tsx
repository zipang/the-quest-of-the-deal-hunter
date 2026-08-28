import { FormContext } from "@components/form/utils/field-context";
import { Root as RadixRoot } from "@radix-ui/react-form";
import type { FC, FormEvent, ReactNode } from "react";

import "./Form.css";

/** Props accepted by the `Form` facade. */
export interface FormProps {
	/** Submit handler; only fires when client-side validation passes. */
	onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
	/** Clears server errors before re-submit or reset (see Radix docs). */
	onClearServerErrors?: () => void;
	/** The fields and controls of the form. */
	children: ReactNode;
}

/**
 * Renders the `<form>` element of the form family and marks its children as
 * "inside a form" so field components never nest a second `<form>`.
 *
 * @param props - Submit handlers and the form content.
 * @returns A Radix `Form.Root` carrying the `form` class.
 * @example
 * <Form onSubmit={save}>
 *   <TextField name="title" label="Item" required />
 *   <NumberField name="budget" label="Budget" min={0} />
 * </Form>
 */
export const Form: FC<FormProps> = ({ onSubmit, onClearServerErrors, children }) => (
	<FormContext.Provider value={true}>
		<RadixRoot className="form" onSubmit={onSubmit} onClearServerErrors={onClearServerErrors}>
			{children}
		</RadixRoot>
	</FormContext.Provider>
);
