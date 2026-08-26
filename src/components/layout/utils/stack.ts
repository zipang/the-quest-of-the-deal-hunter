import type { CSSProperties, ReactNode } from "react";
import type { SpaceToken } from "../../utils/spacing";
import { spaceVar } from "../../utils/spacing";

/** Props every stack component shares on top of spacing and gap. */
export interface StackBaseProps {
	/** Content laid out by the stack. */
	children?: ReactNode;
	/** Allow children to wrap onto new rows. @defaultValue false */
	wrap?: boolean;
	/** Render as inline-flex instead of flex. @defaultValue false */
	inline?: boolean;
}

/**
 * Builds the flexible part of a stack's inline style.
 *
 * @param gap - Token naming the space between children.
 * @param wrap - Whether children may wrap onto new rows.
 * @returns A partial style containing `gap` (as a token reference) and
 *   `flexWrap`; safe to spread into any layout container's style prop.
 * @example
 * stackContentStyle("md", false)
 * // { gap: "var(--space-md)" }
 */
export const stackContentStyle = (gap: SpaceToken, wrap: boolean): Partial<CSSProperties> => ({
	gap: spaceVar(gap),
	flexWrap: wrap ? "wrap" : "nowrap"
});
