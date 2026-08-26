import type { FC, ReactNode } from "react";
import { VStack, type VStackProps } from "../layout/VStack";

import "./page.css";

/** Props of the scrollable page body region. */
export interface PageBodyProps extends VStackProps {
	/** Content of the scrolling region. */
	children: ReactNode;
}

/**
 * Main region of a page: takes the remaining height and scrolls internally
 * while header and footer stay visible. Accepts every VStack prop.
 *
 * @param props - Body content plus any VStack prop.
 * @returns A scrolling flex column rendered as `<main>` by default.
 * @example
 * <PageBody gap="md" padding="lg">
 *   <DealCard />
 *   <DealCard />
 * </PageBody>
 */
export const PageBody: FC<PageBodyProps> = ({ className = "", as = "main", ...vstackProps }) => (
	<VStack className={["page-body", className].filter(Boolean).join(" ")} as={as} {...vstackProps} />
);
