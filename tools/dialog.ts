/**
 * Styled, promise-based replacements for the native `confirm()` and
 * `prompt()` modals, rendered with a single `<dialog>` built by this module.
 *
 * The functions keep the native names on purpose: call sites read exactly
 * like their native counterparts. Unlike the native modals they are
 * asynchronous — always `await` them. `confirm()` resolves `true` on OK and
 * `false` on cancel/Escape; `prompt()` resolves the input value (possibly
 * "") on OK and `null` on cancel/Escape.
 *
 * Imported (and bundled) by the inline script of `sprite-manager.html`;
 * the styles live in `dialog.css`.
 */

/** Visual level of a modal action: `danger` (destructive), `warning`
 * (discards work), or `default`. */
type ModalLevel = "default" | "warning" | "danger";

/** Options accepted by {@link confirm}. */
interface ConfirmOptions {
	/** Label of the OK button.
	 * @defaultValue `"OK"` */
	okText?: string;
	/** Visual level applied to the OK button.
	 * @defaultValue `"default"` */
	level?: ModalLevel;
}

/** Options accepted by {@link prompt}. */
interface PromptOptions extends ConfirmOptions {
	/** Initial value of the input.
	 * @defaultValue `""` */
	value?: string;
}

/** Parameters for the internal modal builder. */
interface ModalParams {
	/** Message shown above the (optional) input. */
	label: string;
	/** Show a text input (prompt) or not (confirm). */
	withInput: boolean;
	/** Pre-filled input value. */
	value?: string;
	/** OK button label. */
	okText: string;
	/** Visual level applied to the OK button. */
	level: ModalLevel;
}

const LEVEL_CLASS: Record<ModalLevel, string> = {
	default: "",
	warning: "warning",
	danger: "danger"
};

let modalElt: HTMLDialogElement | null = null;
let labelElt: HTMLLabelElement;
let inputElt: HTMLInputElement;
let okElt: HTMLButtonElement;
let withInput = false;
let resolveCurrent: ((value: string | boolean | null) => void) | null = null;

/** Build the modal DOM once and wire its dismissal paths. */
function ensureModal(): HTMLDialogElement {
	if (modalElt) return modalElt;
	modalElt = document.createElement("dialog");
	modalElt.id = "modal";
	const formElt = document.createElement("form");
	formElt.method = "dialog";
	labelElt = document.createElement("label");
	labelElt.id = "modal-label";
	inputElt = document.createElement("input");
	inputElt.id = "modal-input";
	inputElt.type = "text";
	inputElt.spellcheck = false;
	const rowElt = document.createElement("div");
	rowElt.className = "row";
	const cancelElt = document.createElement("button");
	cancelElt.id = "modal-cancel";
	cancelElt.type = "button";
	cancelElt.className = "ghost";
	cancelElt.textContent = "Cancel";
	okElt = document.createElement("button");
	okElt.id = "modal-ok";
	okElt.type = "submit";
	rowElt.append(cancelElt, okElt);
	formElt.append(labelElt, inputElt, rowElt);
	modalElt.append(formElt);
	document.body.append(modalElt);

	// OK: resolve with the input value (prompt) or `true` (confirm).
	formElt.addEventListener("submit", (e) => {
		e.preventDefault();
		closeModal(withInput ? inputElt.value : true);
	});
	cancelElt.addEventListener("click", () => closeModal(null));
	// Escape (and any other native close) resolves as a cancellation.
	modalElt.addEventListener("close", () => closeModal(null));
	return modalElt;
}

/** Resolve the pending modal (at most once) and close it. */
function closeModal(value: string | boolean | null): void {
	if (!resolveCurrent) return;
	const resolve = resolveCurrent;
	resolveCurrent = null;
	modalElt?.close();
	resolve(value);
}

/**
 * Open the modal and resolve with what the user answered.
 *
 * @param params.label - Message shown above the (optional) input.
 * @param params.withInput - Show a text input (prompt) or not (confirm).
 * @param params.value - Pre-filled input value.
 * @param params.okText - OK button label.
 * @param params.level - Visual level applied to the OK button.
 * @returns The input value (prompt) or `true` (confirm), or `null` when cancelled.
 */
function showModal(params: ModalParams): Promise<string | boolean | null> {
	const dialog = ensureModal();
	withInput = params.withInput;
	labelElt.textContent = params.label;
	labelElt.htmlFor = withInput ? "modal-input" : "";
	inputElt.hidden = !withInput;
	inputElt.required = withInput;
	inputElt.value = params.value ?? "";
	okElt.textContent = params.okText;
	okElt.className = LEVEL_CLASS[params.level ?? "default"];
	return new Promise((resolve) => {
		resolveCurrent = resolve;
		dialog.showModal();
		if (withInput) {
			inputElt.focus();
			inputElt.select();
		} else {
			okElt.focus();
		}
	});
}

/**
 * Ask for confirmation, styled like the app.
 *
 * @param message - Question shown to the user.
 * @param options - OK button label and visual level.
 * @returns `true` when the user confirms, `false` on cancel/Escape.
 * @example
 * if (!(await confirm("Delete 3 sprites from 64x64/?", { okText: "Delete", level: "danger" }))) return;
 */
export function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
	return showModal({
		label: message,
		withInput: false,
		okText: options.okText ?? "OK",
		level: options.level ?? "default"
	}).then((value) => value === true);
}

/**
 * Ask for a short text, styled like the app.
 *
 * @param label - Caption shown above the input.
 * @param options - Initial value, OK button label and visual level.
 * @returns The entered text (possibly "") on OK, `null` on cancel/Escape.
 * @example
 * const name = await prompt("Sprite name (kebab-case):", { okText: "Save" });
 * if (!name) return; // cancelled
 */
export function prompt(label: string, options: PromptOptions = {}): Promise<string | null> {
	return showModal({
		label,
		withInput: true,
		value: options.value ?? "",
		okText: options.okText ?? "OK",
		level: options.level ?? "default"
	}).then((value) => (typeof value === "string" ? value : null));
}
