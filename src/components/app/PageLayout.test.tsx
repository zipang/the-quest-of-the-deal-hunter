import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { PageLayout } from "@components/app/PageLayout";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("PageLayout", () => {
	test("renders a full-height flex column shell", () => {
		const elt = html(
			<PageLayout>
				<span>a</span>
			</PageLayout>
		);
		expect(elt.tagName).toBe("DIV");
		expect(elt.className).toBe("v-stack page-layout");
	});

	test("VStack props pass through (gap, padding)", () => {
		const elt = html(<PageLayout gap="md" padding="lg" />);
		expect(elt.style.gap).toBe("var(--space-md)");
		expect(elt.style.padding).toBe("var(--space-lg)");
	});

	test("extra classes are appended to the page class", () => {
		const elt = html(<PageLayout className="quest-screen" />);
		expect(elt.className).toBe("v-stack page-layout quest-screen");
	});
});
