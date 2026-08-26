import type { CSSProperties, FC } from "react";
import { buildSpacingStyle, type GapProps, type SpacingProps } from "@components/utils/spacing";
import type { LayoutTag } from "@components/utils/tag";
import { type StackBaseProps, stackContentStyle } from "@components/layout/utils/stack";

import "./VStack.css";

/** Cross-column alignment of children inside a vertical stack. */
type VStackAlign = "left" | "right" | "center";

/** Props of the vertical flex stack. */
export interface VStackProps extends SpacingProps, GapProps, StackBaseProps {
	/** Where children sit along the column. @defaultValue "top" */
	stackItems?: "top" | "bottom" | "center" | "justify" | "evenly";
	/** How children line up across the column. @defaultValue "left" */
	alignItems?: VStackAlign;
	/** Semantic grouping element rendered by the stack. @defaultValue "div" */
	as?: LayoutTag;
}

/** `stackItems` → CSS justify-content (only non-default values needed). */
const STACK_ITEMS: Record<Exclude<VStackProps["stackItems"], undefined>, string> = {
	top: "flex-start",
	bottom: "flex-end",
	center: "center",
	justify: "space-between",
	evenly: "space-evenly"
};

/** `alignItems` → CSS align-items (only non-default values needed). */
const ALIGN_ITEMS: Record<VStackAlign, string> = {
	left: "flex-start",
	right: "flex-end",
	center: "center"
};

/**
 * Vertical flex container: children flow top to bottom.
 * Compose screens and sections with it instead of raw divs.
 *
 * @param props - Stack direction is fixed; everything else comes from
 *   spacing/gap tokens plus the intuitive placement keywords.
 * @returns A flex column element (`as`, default `<div>`).
 * @example
 * <VStack gap="md" padding="lg" stackItems="justify" as="section">
 *   <h2>Title</h2>
 *   <p>Body</p>
 * </VStack>
 */
export const VStack: FC<VStackProps> = ({
	children,
	className = "",
	gap = "base",
	wrap = false,
	inline = false,
	as = "div",
	stackItems,
	alignItems,
	...spacing
}) => {
	const Tag = as;
	const style: Partial<CSSProperties> = {
		...buildSpacingStyle(spacing),
		...stackContentStyle(gap, wrap)
	};

	const justifyContent = stackItems ? STACK_ITEMS[stackItems] : undefined;
	if (justifyContent) style.justifyContent = justifyContent;

	const alignItemsValue = alignItems ? ALIGN_ITEMS[alignItems] : undefined;
	if (alignItemsValue) style.alignItems = alignItemsValue;

	const baseClass = inline ? "v-stack v-stack--inline" : "v-stack";

	// Compose classes without stray spaces when className is empty.
	const allClasses = [baseClass, className].filter(Boolean).join(" ");

	return (
		<Tag className={allClasses} style={style}>
			{children}
		</Tag>
	);
};
