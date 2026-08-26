import type { FC, ReactNode } from "react";
import { VStack, type VStackProps } from "../layout/VStack";

import "./page.css";

/** Props of the page header region. */
export interface PageHeaderProps extends VStackProps {
	/** Content shown in the top region (title, back button…). */
	children: ReactNode;
}

/**
 * Top region of a page: fixed content above the scrolling body.
 * Accepts every VStack prop for internal layout (gap, padding, alignment).
 *
 * @param props - Header content plus any VStack prop.
 * @returns A non-scrolling header block rendered as `<header>` by default.
 * @example
 * <PageHeader padding="lg" stackItems="justify">
 *   <h1>DAILY QUEST</h1>
 * </PageHeader>
 */
export const PageHeader: FC<PageHeaderProps> = ({
	className = "",
	as = "header",
	...vstackProps
}) => (
	<VStack
		className={["page-header", className].filter(Boolean).join(" ")}
		as={as}
		{...vstackProps}
	/>
);
