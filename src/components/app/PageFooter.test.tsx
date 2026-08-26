import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { PageFooter } from "./PageFooter";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("PageFooter", () => {
	test("renders a footer block by default", () => {
		const elt = html(<PageFooter>Actions</PageFooter>);
		expect(elt.tagName).toBe("FOOTER");
		expect(elt.className).toBe("v-stack page-footer");
	});

	test("safe-area padding and VStack props pass through", () => {
		const elt = html(
			<PageFooter padding="lg" stackItems="justify">
				A
			</PageFooter>
		);
		expect(elt.style.padding).toBe("var(--space-lg)");
		expect(elt.style.justifyContent).toBe("space-between");
	});
});
