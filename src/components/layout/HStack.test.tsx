import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { HStack } from "@components/layout/HStack";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("HStack", () => {
	test("renders a flex row div by default", () => {
		const elt = html(
			<HStack>
				<span>a</span>
			</HStack>
		);
		expect(elt.tagName).toBe("DIV");
		expect(elt.className).toBe("h-stack");
	});

	test("renders an inline variant when inline is set", () => {
		const elt = html(<HStack inline />);
		expect(elt.className).toBe("h-stack h-stack--inline");
	});

	test("baseline cross alignment and end flow are supported", () => {
		const elt = html(<HStack alignItems="baseline" stackItems="right" />);
		expect(elt.style.alignItems).toBe("baseline");
		expect(elt.style.justifyContent).toBe("flex-end");
	});

	test("gap defaults to base", () => {
		const elt = html(<HStack gap="sm" paddingX="md" />);
		expect(elt.style.gap).toBe("var(--space-sm)");
		expect(elt.style.paddingInline).toBe("var(--space-md)");
	});
});
