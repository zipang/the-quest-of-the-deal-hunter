import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { SpriteAnimation } from "@components/ui/SpriteAnimation";

afterEach(cleanup);

const html = (ui: React.ReactElement) => {
	const { container } = render(ui);
	return container.firstElementChild as HTMLElement;
};

describe("SpriteAnimation", () => {
	test("shows the first cell when the played animation is unknown", () => {
		const elt = html(<SpriteAnimation spritesheet="/s.png" grid="16x16" play="nope" />);
		expect(elt.style.backgroundImage).toBe('url("/s.png")');
		expect(elt.style.backgroundSize).toBe("100% 100%");
		expect(elt.style.getPropertyValue("--sprite-scale")).toBe("4");
		expect(elt.style.animationName).toBe("");
	});

	test("declares a frames-per-second duration for a multi-frame animation", () => {
		const elt = html(
			<SpriteAnimation
				spritesheet="/s.png"
				grid="32x32"
				animations={{ run: { from: [0, 0], to: [1, 0], fps: 4 } }}
				play="run"
			/>
		);
		expect(elt.style.animationDuration).toBe("0.5s");
		expect(elt.querySelector("style")?.textContent).toContain("@keyframes");
	});

	test("derives the sheet size from the furthest declared frame", () => {
		const elt = html(
			<SpriteAnimation
				spritesheet="/s.png"
				grid="16x16"
				animations={{ run: { from: [0, 0], to: [2, 1] } }}
			/>
		);
		expect(elt.style.backgroundSize).toBe("300% 200%");
	});

	test("a decorative sprite is hidden from assistive technology", () => {
		const plainElt = html(<SpriteAnimation spritesheet="/s.png" grid="16x16" />);
		expect(plainElt.getAttribute("aria-hidden")).toBe("true");

		const labeledElt = html(<SpriteAnimation spritesheet="/s.png" grid="16x16" alt="Spinning coin" />);
		expect(labeledElt.getAttribute("role")).toBe("img");
		expect(labeledElt.getAttribute("aria-label")).toBe("Spinning coin");
	});
});
