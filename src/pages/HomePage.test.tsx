import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HomePage } from "./HomePage";

afterEach(cleanup);

describe("HomePage", () => {
	test("renders the application title over the road animation", () => {
		const { container } = render(
			<MemoryRouter>
				<HomePage />
			</MemoryRouter>
		);
		const headingElt = container.querySelector("h1");
		expect(headingElt?.textContent).toBe("The Quest of the Deal Hunter");
		expect(container.querySelector(".home-skyline")).not.toBeNull();
	});
});
