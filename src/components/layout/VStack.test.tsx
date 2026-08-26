import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { VStack } from "./VStack";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("VStack", () => {
	test("renders a flex column div by default", () => {
		const elt = html(
			<VStack>
				<span>a</span>
			</VStack>
		);
		expect(elt.tagName).toBe("DIV");
		expect(elt.className).toBe("v-stack");
	});

	test("renders the semantic tag given via as", () => {
		const elt = html(<VStack as="section" />);
		expect(elt.tagName).toBe("SECTION");
	});

	test("gap defaults to base and spacing props emit token vars", () => {
		const elt = html(<VStack padding="lg" marginTop="none" />);
		expect(elt.style.gap).toBe("var(--space-base)");
		expect(elt.style.padding).toBe("var(--space-lg)");
		// happy-dom normalizes "0" to "0px"
		expect(["0", "0px"]).toContain(elt.style.marginTop);
	});

	test("stackItems and alignItems map to flex placements", () => {
		const elt = html(<VStack stackItems="justify" alignItems="center" />);
		expect(elt.style.justifyContent).toBe("space-between");
		expect(elt.style.alignItems).toBe("center");
	});

	test("wrap emits nowrap unless requested", () => {
		expect(html(<VStack />).style.flexWrap).toBe("nowrap");
		expect(html(<VStack wrap />).style.flexWrap).toBe("wrap");
	});
});
