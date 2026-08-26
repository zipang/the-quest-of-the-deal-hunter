import type { FC, ReactNode } from "react";
import { VStack, type VStackProps } from "@components/layout/VStack";

import "./page.css";

/** Props of the page footer region. */
export interface PageFooterProps extends VStackProps {
	/** Actions pinned at the bottom of the page. */
	children: ReactNode;
}

/**
 * Bottom region of a page: hosts primary actions above the safe area.
 * Accepts every VStack prop for internal layout.
 *
 * @param props - Footer actions plus any VStack prop.
 * @returns A non-scrolling footer block rendered as `<footer>` by default,
 *   separated from the body by a hairline top border.
 * @example
 * <PageFooter gap="sm" padding="lg">
 *   <Button fullWidth>START QUEST</Button>
 * </PageFooter>
 */
export const PageFooter: FC<PageFooterProps> = ({
	className = "",
	as = "footer",
	...vstackProps
}) => (
	<VStack
		className={["page-footer", className].filter(Boolean).join(" ")}
		as={as}
		{...vstackProps}
	/>
);
