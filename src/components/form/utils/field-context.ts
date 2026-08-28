import { createContext, useContext } from "react";

/**
 * Flags that the current component tree already renders a `Form` (Radix
 * `Form.Root`) wrapper. Fields read it to avoid nesting a second `<form>`
 * element when they are composed inside `Form`.
 */
export const FormContext = createContext<boolean>(false);

/**
 * Reports whether the field is rendered inside a `Form` component.
 *
 * @returns `true` when a parent `Form` provides the form element, so the field
 * must render only its `Form.Field` parts.
 * @example
 * const insideForm = useInsideForm();
 * const root = insideForm ? children : <Form.Root>{children}</Form.Root>;
 */
export const useInsideForm = (): boolean => useContext(FormContext);
