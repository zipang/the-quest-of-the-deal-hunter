import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Grid } from "@components/layout/Grid";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("Grid", () => {
	test("renders a grid div with the default gap", () => {
		const elt = html(
			<Grid>
				<span>a</span>
			</Grid>
		);
		expect(elt.tagName).toBe("DIV");
		expect(elt.className).toBe("grid");
		expect(elt.style.gap).toBe("var(--space-base)");
	});

	test("columns emit an equal-width track template", () => {
		const elt = html(<Grid columns={3} />);
		expect(elt.style.gridTemplateColumns).toBe("repeat(3, 1fr)");
	});

	test("columnGap and rowGap override the shared gap", () => {
		const elt = html(<Grid gap="md" columnGap="lg" rowGap="none" />);
		expect(elt.style.gap).toBe("var(--space-md)");
		expect(elt.style.columnGap).toBe("var(--space-lg)");
		expect(elt.style.rowGap).toBe("0");
	});

	test("spacing props and semantic tag compose", () => {
		const elt = html(<Grid as="section" padding="xl" margin="sm" />);
		expect(elt.tagName).toBe("SECTION");
		expect(elt.style.padding).toBe("var(--space-xl)");
		expect(elt.style.margin).toBe("var(--space-sm)");
	});

	test("template columns win over the simple column mode", () => {
		const elt = html(<Grid columns={3} templateColumns="auto 1fr 2fr" />);
		expect(elt.style.gridTemplateColumns).toBe("auto 1fr 2fr");
	});

	test("template rows and auto rows are applied", () => {
		const elt = html(<Grid templateRows="1fr auto" autoRows="2rem" />);
		expect(elt.style.gridTemplateRows).toBe("1fr auto");
		expect(elt.style.gridAutoRows).toBe("2rem");
	});

	test("mixing columns with templates warns in dev", () => {
		const warnings: string[] = [];
		const originalWarn = console.warn;
		console.warn = (message: string) => warnings.push(message);
		try {
			html(<Grid columns={2} templateRows="1fr" />);
		} finally {
			console.warn = originalWarn;
		}
		expect(warnings.length).toBe(1);
		expect(warnings[0]).toContain("'columns' is ignored");
	});
});
