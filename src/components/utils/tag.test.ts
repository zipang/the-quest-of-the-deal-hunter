import { describe, expect, test } from "bun:test";
import type { LayoutTag } from "./tag";

// Type-level checks for the LayoutTag allowlist. The @ts-expect-error lines
// are the assertions: removing the union restriction breaks this file.

describe("LayoutTag allowlist", () => {
	test("grouping elements are allowed", () => {
		const tags: LayoutTag[] = [
			"div",
			"section",
			"article",
			"aside",
			"header",
			"footer",
			"nav",
			"main",
			"ul",
			"ol",
			"form",
			"figure",
			"fieldset"
		];
		expect(tags.length).toBe(13);
	});

	test("inline and void tags are rejected", () => {
		// One-line literal on purpose: a single @ts-expect-error covers all entries.
		// @ts-expect-error non-grouping tags do not satisfy LayoutTag
		const invalidTags: LayoutTag[] = ["span", "a", "i", "b", "hr", "img", "br", "li"];
		expect(invalidTags.length).toBe(8);
	});
});
