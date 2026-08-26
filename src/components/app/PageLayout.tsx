import type { FC } from "react";
import { VStack, type VStackProps } from "@components/layout/VStack";

import "./page.css";

/** Props of the full-screen page shell. */
export interface PageLayoutProps extends VStackProps {}

/**
 * Full-screen page shell: fills the viewport, stacks its regions vertically
 * and keeps the footer pinned at the bottom. Use it as the root of every
 * routed screen, with PageHeader / PageBody / PageFooter as direct children.
 *
 * @param props - Any VStack prop (gap, padding, alignment, `as`, …).
 * @returns A viewport-height flex column (`as`, default `<div>`).
 * @example
 * <PageLayout>
 *   <PageHeader title="DAILY QUEST" />
 *   <PageBody>...</PageBody>
 *   <PageFooter>{/* actions *\/}</PageFooter>
 * </PageLayout>
 */
export const PageLayout: FC<PageLayoutProps> = ({ className = "", ...vstackProps }) => (
	<VStack className={["page-layout", className].filter(Boolean).join(" ")} {...vstackProps} />
);
