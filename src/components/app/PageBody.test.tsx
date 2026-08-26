import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { PageBody } from "./PageBody";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("PageBody", () => {
	test("renders a main block by default", () => {
		const elt = html(<PageBody>Content</PageBody>);
		expect(elt.tagName).toBe("MAIN");
		expect(elt.className).toBe("v-stack page-body");
	});

	test("VStack spacing props pass through", () => {
		const elt = html(
			<PageBody padding="lg" gap="xl">
				C
			</PageBody>
		);
		expect(elt.style.padding).toBe("var(--space-lg)");
		expect(elt.style.gap).toBe("var(--space-xl)");
	});

	test("renders the semantic tag given via as", () => {
		const elt = html(<PageBody as="section">C</PageBody>);
		expect(elt.tagName).toBe("SECTION");
	});
});
