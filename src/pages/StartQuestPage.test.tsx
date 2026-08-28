import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { StartQuestPage } from "./StartQuestPage";

afterEach(cleanup);

describe("StartQuestPage", () => {
	test("renders the quest prompt and the empty-quest placeholder", () => {
		const { container } = render(<StartQuestPage />);
		const headingElt = container.querySelector("h1");
		expect(headingElt?.textContent).toBe("What are you hunting?");
		expect(container.querySelector(".start-quest-trophy")).not.toBeNull();
		expect(container.textContent).toContain("NO QUEST ITEM ADDED");
	});

	test("offers the add-item and start-quest actions in the footer", () => {
		const { getByText } = render(<StartQuestPage />);
		const addElt = getByText("ADD ITEM");
		const startElt = getByText("▶ START QUEST");
		expect(addElt.tagName).toBe("BUTTON");
		expect(startElt.tagName).toBe("BUTTON");
		expect(addElt.className).toContain("button--outline");
		expect(startElt.className).toContain("button--solid");
	});
});
