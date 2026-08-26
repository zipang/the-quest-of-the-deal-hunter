import type { CSSProperties, FC, ReactNode } from "react";
import { buildSpacingStyle, type SpaceToken, type SpacingProps, spaceVar } from "../utils/spacing";
import type { LayoutTag } from "../utils/tag";

import "./Grid.css";

/** Props of the grid layout container. */
export interface GridProps extends SpacingProps {
	/** Content laid out by the grid. */
	children?: ReactNode;
	/** Fixed number of equal columns. @defaultValue unset */
	columns?: number;
	/** Explicit CSS grid-template-columns value (escape hatch). */
	templateColumns?: string;
	/** Explicit CSS grid-template-rows value (escape hatch). */
	templateRows?: string;
	/** Height of implicitly created rows. */
	autoRows?: string;
	/** Space between all children. @defaultValue base */
	gap?: SpaceToken;
	/** Overrides the column gap only. */
	columnGap?: SpaceToken;
	/** Overrides the row gap only. */
	rowGap?: SpaceToken;
	/** Semantic grouping element rendered by the grid. @defaultValue div */
	as?: LayoutTag;
}

/**
 * Grid container for card layouts and tiled content.
 * Simple mode repeats `columns` equal tracks; combine with spacing tokens.
 *
 * @param props - Track count plus token-based gaps and spacing.
 * @returns A grid element (`as`, default `<div>`).
 * @example
 * <Grid columns={3} gap="md" padding="lg">
 *   <Card />
 *   <Card />
 * </Grid>
 */
export const Grid: FC<GridProps> = ({
	children,
	columns,
	templateColumns,
	templateRows,
	autoRows,
	gap = "base",
	columnGap,
	rowGap,
	as = "div",
	...spacing
}) => {
	const Tag = as;
	const style: Partial<CSSProperties> = {
		...buildSpacingStyle(spacing),
		gap: spaceVar(gap)
	};

	// Templates are escape hatches: they win over the simple column mode.
	if (templateColumns) style.gridTemplateColumns = templateColumns;
	else if (columns) style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

	// Mixing the simple mode with escape hatches signals a props mistake.
	// The check runs in every environment; bun test exposes no DEV flag.
	const usesTemplates = Boolean(templateColumns || templateRows || autoRows);
	if (columns && usesTemplates) {
		console.warn(
			"Grid: 'columns' is ignored because template props are set. Remove one of the two modes."
		);
	}

	if (templateRows) style.gridTemplateRows = templateRows;
	if (autoRows) style.gridAutoRows = autoRows;
	if (columnGap) style.columnGap = spaceVar(columnGap);
	if (rowGap) style.rowGap = spaceVar(rowGap);

	return (
		<Tag className="grid" style={style}>
			{children}
		</Tag>
	);
};
