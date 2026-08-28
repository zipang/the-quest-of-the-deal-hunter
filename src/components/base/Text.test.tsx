import { afterEach, describe, expect, test } from "bun:test";
import { Text } from "@components/base/Text";
import { cleanup, render } from "@testing-library/react";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("Text", () => {
	test("renders a paragraph with base size and default color", () => {
		const elt = html(<Text>Copy</Text>);
		expect(elt.tagName).toBe("P");
		expect(elt.className).toBe("text text--base");
		expect(elt.style.color).toBe("var(--color-text)");
	});

	test("size and color roles compose from tokens", () => {
		const elt = html(
			<Text size="sm" color="muted">
				Hint
			</Text>
		);
		expect(elt.className).toBe("text text--sm");
		expect(elt.style.color).toBe("var(--color-text-muted)");
	});

	test("brand and action colors resolve to their token vars", () => {
		const primaryElt = html(<Text color="primary">G</Text>);
		const dangerElt = html(<Text color="danger">D</Text>);
		expect(primaryElt.style.color).toBe("var(--color-brand-primary)");
		expect(dangerElt.style.color).toBe("var(--color-action-danger)");
	});

	test("the inherit color passes through untouched", () => {
		expect(html(<Text color="inherit">I</Text>).style.color).toBe("inherit");
	});
});
