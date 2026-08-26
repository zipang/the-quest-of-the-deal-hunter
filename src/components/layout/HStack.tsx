import type { CSSProperties, FC } from "react";
import { buildSpacingStyle, type GapProps, type SpacingProps } from "../utils/spacing";
import type { LayoutTag } from "../utils/tag";
import { type StackBaseProps, stackContentStyle } from "./utils/stack";

import "./HStack.css";

/** Cross-row alignment of children inside a horizontal stack. */
type HStackAlign = "top" | "bottom" | "center" | "baseline";

/** Props of the horizontal flex stack. */
export interface HStackProps extends SpacingProps, GapProps, StackBaseProps {
	/** Where children sit along the row. @defaultValue "left" */
	stackItems?: "left" | "right" | "center" | "justify";
	/** How children line up across the row. @defaultValue "center" */
	alignItems?: HStackAlign;
	/** Semantic grouping element rendered by the stack. @defaultValue "div" */
	as?: LayoutTag;
}

/** `stackItems` → CSS justify-content (only non-default values needed). */
const STACK_ITEMS: Record<Exclude<HStackProps["stackItems"], undefined>, string> = {
	left: "flex-start",
	right: "flex-end",
	center: "center",
	justify: "space-between"
};

/** `alignItems` → CSS align-items (only non-default values needed). */
const ALIGN_ITEMS: Record<HStackAlign, string> = {
	top: "flex-start",
	bottom: "flex-end",
	center: "center",
	baseline: "baseline"
};

/**
 * Horizontal flex container: children flow left to right.
 * Compose rows of controls and chips with it instead of raw divs.
 *
 * @param props - Stack direction is fixed; everything else comes from
 *   spacing/gap tokens plus the intuitive placement keywords.
 * @returns A flex row element (`as`, default `<div>`).
 * @example
 * <HStack gap="sm" alignItems="top" as="header">
 *   <BackButton />
 *   <h1>Title</h1>
 * </HStack>
 */
export const HStack: FC<HStackProps> = ({
	children,
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

	return (
		<Tag className={inline ? "h-stack h-stack--inline" : "h-stack"} style={style}>
			{children}
		</Tag>
	);
};
