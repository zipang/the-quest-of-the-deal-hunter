import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { HomePage } from "./HomePage";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("HomePage", () => {
	test("renders the app title inside a page shell", () => {
		const pageElt = html(<HomePage />);
		expect(pageElt.className).toBe("v-stack page-layout");

		const headingElt = pageElt.querySelector("h1");
		expect(headingElt?.textContent).toBe("The Quest of the Deal Hunter");
	});

	test("title lives in the scrollable body region", () => {
		const pageElt = html(<HomePage />);
		const bodyElt = pageElt.querySelector("main.page-body");
		expect(bodyElt?.querySelector("h1.heading")).not.toBeNull();
	});
});
