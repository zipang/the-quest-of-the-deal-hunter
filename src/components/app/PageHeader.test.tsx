import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("PageHeader", () => {
	test("renders a header block by default", () => {
		const elt = html(<PageHeader>Title</PageHeader>);
		expect(elt.tagName).toBe("HEADER");
		expect(elt.className).toBe("v-stack page-header");
	});

	test("VStack alignment props pass through", () => {
		const elt = html(
			<PageHeader stackItems="justify" alignItems="center" gap="sm">
				T
			</PageHeader>
		);
		expect(elt.style.justifyContent).toBe("space-between");
		expect(elt.style.alignItems).toBe("center");
		expect(elt.style.gap).toBe("var(--space-sm)");
	});
});
