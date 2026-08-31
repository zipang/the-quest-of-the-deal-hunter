/**
 * Sprite Manager — client state model.
 *
 * The UI keeps a "virtual" state that diverges from disk until Reorder:
 * - `sprites`:    what is on disk (names only), refreshed by `loadSprites()`.
 * - `order`:      current display order (original disk names).
 * - `virtNums`:   original name -> displayed 3-digit index (virtual).
 * - `virtNames`:  original name -> displayed kebab name part (virtual).
 * - `selected`:   original names currently selected (delete / export).
 *
 * Every structural change (drag reorder, index edit, delete) calls
 * `renumber()` so displayed indices stay unique and gapless. Reorder commits
 * the virtual state to disk through POST /sprites/apply; Discard reloads.
 */
// Styled, promise-based replacements for the native confirm()/prompt().
// Module-scope shadowing keeps call sites reading natively; always await.
import { confirm, prompt } from "./dialog.ts";
import { removeBackground } from "./background-removal.ts";

const $ = (sel) => document.querySelector(sel);
const grid = $("#grid");
const statusEl = $("#status");

// Size folder the Organize tab currently works on (one folder at a time).
let curSize = $("#size-select").value;
let sprites = []; // [{ name }] — state on disk of the current size folder
const selected = new Set(); // original names
const virtNums = new Map(); // original name -> displayed index (virtual)
const virtNames = new Map(); // original name -> displayed name part (virtual)
let order = []; // original names, current display order
let dragName = null;
let lastSelected = null; // anchor card for SHIFT+CLICK range selection
let loadEpoch = 0; // cache-buster: renames reuse filenames with new content

const setStatus = (msg) => {
	statusEl.textContent = msg;
};
const pad = (n) => String(n).padStart(3, "0");
// Displayed name of a sprite, from virtual state (unique index guaranteed
// by renumbering after every structural change).
const displayName = (name) =>
	`${pad(virtNums.get(name) ?? parseInt(parts(name).num, 10))}-${virtNames.get(name) ?? parts(name).name}.png`;

// Renumber the whole series gaplessly from the display order.
function renumber() {
	order.forEach((n, i) => {
		virtNums.set(n, i + 1);
	});
}

// Reload the on-disk state and drop every virtual edit.
async function loadSprites() {
	loadEpoch++;
	const body = (await (await fetch(`/sprites?size=${curSize}`, { cache: "no-store" })).json()) as {
		sprites?: { name: string }[];
	};
	sprites = body.sprites ?? [];
	order = sprites.map((s) => s.name);
	selected.clear();
	virtNums.clear();
	virtNames.clear();
	refresh();
}

// Number of sprites whose displayed name differs from the disk name.
function pendingCount() {
	let changed = 0;
	for (const n of order) if (displayName(n) !== n) changed++;
	return changed;
}

// Enable/disable toolbar buttons according to the current state.
function updateToolbar() {
	$("#sheet-count").textContent = selected.size;
	$("#delete-btn").disabled = selected.size === 0;
	$("#sheet-btn").disabled = selected.size === 0;
	const p = pendingCount();
	$("#pending-count").textContent = p;
	$("#apply-btn").disabled = p === 0;
	$("#discard-btn").disabled = p === 0;
}

// One redraw per state change: rebuild the grid, then sync the toolbar.
function refresh() {
	render();
	updateToolbar();
}

// Rebuild the whole grid from `order`. Card labels are two editable zones
// (index and kebab name) so an index edit moves the sprite, see commitEdit.
function render() {
	grid.innerHTML = "";
	for (const name of order) {
		const card = document.createElement("div");
		card.className = `card${selected.has(name) ? " selected" : ""}`;
		card.dataset.name = name;
		card.draggable = true;

		const wrap = document.createElement("div");
		wrap.className = "img-wrap";
		const img = document.createElement("img");
		img.src = `/${curSize}/${encodeURIComponent(name)}?v=${loadEpoch}`;
		img.loading = "lazy";
		img.alt = name;
		img.title = name;
		img.draggable = false; // the card is the dragged element
		wrap.appendChild(img);

		// label: editable <num> - <name> zones
		const label = document.createElement("div");
		label.className = "name";
		const cur = displayName(name);
		const { num, name: namePart } = parts(cur);
		const numSpan = makeEditable(num, (v) => commitEdit(name, "num", v));
		const nameSpan = makeEditable(namePart, (v) => commitEdit(name, "name", v));
		label.append(numSpan, " - ", nameSpan);

		card.append(wrap, label);
		card.addEventListener("click", (e) => {
			if (e.target.isContentEditable) return;
			if (e.shiftKey && lastSelected) {
				// range select: whole serie between the anchor card and this one
				const a = order.indexOf(lastSelected);
				const b = order.indexOf(name);
				if (a !== -1 && b !== -1) {
					for (let i = Math.min(a, b); i <= Math.max(a, b); i++) selected.add(order[i]);
				}
			} else {
				toggleSelect(name);
			}
			refresh();
		});
		card.addEventListener("dragstart", (e) => {
			if (e.target.isContentEditable) {
				e.preventDefault();
				return;
			} // no text drags
			dragName = name;
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", name);
			e.dataTransfer.setDragImage(card, card.offsetWidth / 2, card.offsetHeight / 2);
			card.classList.add("dragging");
		});
		card.addEventListener("dragend", () => {
			dragName = null;
			card.classList.remove("dragging");
		});
		card.addEventListener("dragover", (e) => {
			e.preventDefault();
			card.classList.add("drag-over");
		});
		card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
		card.addEventListener("drop", (e) => {
			e.preventDefault();
			card.classList.remove("drag-over");
			if (!dragName || dragName === name) return;
			// Dropping a multi-selection moves every selected card (in their
			// current relative order) to the target position, sequentially.
			const moving =
				selected.has(dragName) && selected.size > 1
					? order.filter((n) => selected.has(n))
					: [dragName];
			if (moving.includes(name)) return; // dropped on its own group
			const before = order.slice(0, order.indexOf(name)).filter((n) => !moving.includes(n)).length;
			for (const n of moving) order.splice(order.indexOf(n), 1);
			order.splice(before, 0, ...moving);
			renumber(); // unique, gapless indices after every reorder
			refresh();
		});
		grid.appendChild(card);
	}
}

// `<num>-<name>.png` : num = 3 digits, name = kebab-case (default "sprite")
const parts = (name) => {
	const [num, ...rest] = name.replace(/\.png$/, "").split("-");
	return { num, name: rest.join("-") || "sprite" };
};
const kebab = (s) =>
	s
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "sprite";

// Load an image URL and resolve with the loaded element (rejects on error).
function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`could not load image: ${src}`));
		img.src = src;
	});
}

// Select/deselect one sprite (pure state change; caller refreshes).
// Clicking another card with SHIFT selects the whole range between them
// (anchor = lastSelected, set on plain clicks).
function toggleSelect(name) {
	selected.has(name) ? selected.delete(name) : selected.add(name);
	lastSelected = selected.has(name) ? name : null;
}

// Inline editable span: Enter commits, Escape restores the initial value,
// blur commits when the text changed.
function makeEditable(value, onCommit) {
	const span = document.createElement("span");
	span.contentEditable = "true";
	span.spellcheck = false;
	span.textContent = value;
	span.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			span.blur();
		}
		if (e.key === "Escape") {
			span.textContent = value;
			span.blur();
		}
	});
	span.addEventListener("blur", () => {
		if (span.textContent !== value) onCommit(span.textContent);
	});
	span.addEventListener("click", (e) => e.stopPropagation());
	return span;
}

function commitEdit(name, zone, value) {
	if (zone === "num") {
		// Editing an index MOVES the sprite to that position, then the whole
		// series is renumbered — indices stay unique at all times.
		const pos = parseInt(value, 10);
		if (Number.isFinite(pos)) {
			const clamped = Math.min(order.length, Math.max(1, pos)) - 1;
			order.splice(order.indexOf(name), 1);
			order.splice(clamped, 0, name);
			renumber();
		}
	} else {
		virtNames.set(name, kebab(value));
	}
	refresh();
}

// Delete selected sprites on disk (current size folder only), then
// renumber gaplessly and commit immediately so no index holes remain.
// Bound to the Delete button, the Delete key (with confirmation) and
// Shift+Delete (immediately).
async function deleteSelected(skipConfirm = false) {
	if (selected.size === 0) return;
	const names = [...selected];
	if (!skipConfirm) {
		const confirmed = await confirm(
			`Delete ${names.length} sprite(s) from ${curSize}/?\nThis cannot be undone.`,
			{ okText: "Delete", level: "danger" }
		);
		if (!confirmed) return;
	}
	// Independent one-file requests: delete in parallel, count failures.
	const results = await Promise.allSettled(
		names.map((name) =>
			fetch(`/sprites/${encodeURIComponent(name)}?size=${curSize}`, { method: "DELETE" })
		)
	);
	const failures = results.filter(
		(r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
	).length;
	if (failures > 0) setStatus(`Failed to delete ${failures} sprite(s)`);
	// Renumber gaplessly right away and commit, so the page shows the new
	// indexes without holes.
	await loadSprites();
	renumber();
	await applyChanges();
	setStatus(`Deleted ${names.length} sprite(s); indices reassigned`);
}

$("#delete-btn").addEventListener("click", () => deleteSelected());

document.addEventListener("keydown", (e) => {
	if (e.key !== "Delete") return;
	const t = e.target as HTMLElement | null;
	if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
	deleteSelected(e.shiftKey);
});

// Commit the displayed state (indices + names) to disk, as-is. Refuses to
// apply when two sprites would land on the same target name.
async function applyChanges() {
	const mapping = [];
	const targets = new Map(); // final name -> original name (collision check)
	for (const cur of order) {
		const next = displayName(cur);
		if (next === cur) continue;
		if (targets.has(next)) {
			setStatus(
				`Conflict: ${targets.get(next)} and ${cur} both target ${next} — fix the indices first`
			);
			return false;
		}
		targets.set(next, cur);
		mapping.push({ from: cur, to: next });
	}
	if (mapping.length === 0) return true;
	const res = await fetch("/sprites/apply", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ size: curSize, order: mapping })
	});
	const body = await res.json();
	setStatus(res.ok ? `Applied ${body.moved} change(s)` : `Apply failed: ${body.error}`);
	if (res.ok) await loadSprites();
	return res.ok;
}

$("#apply-btn").addEventListener("click", applyChanges);

$("#discard-btn").addEventListener("click", loadSprites);

$("#select-all").addEventListener("click", () => {
	order.forEach((n) => {
		selected.add(n);
	});
	refresh();
});

$("#deselect-all").addEventListener("click", () => {
	selected.clear();
	refresh();
});

// Switch size folder: unapplied edits belong to the old folder, so ask
// before discarding them (warning level: careful, not destructive).
$("#size-select").addEventListener("change", async () => {
	const nextSize = $("#size-select").value;
	if (nextSize === curSize) return;
	if (
		pendingCount() > 0 &&
		!(await confirm(`Discard unapplied changes to ${curSize}/?`, {
			okText: "Discard",
			level: "warning"
		}))
	) {
		$("#size-select").value = curSize; // revert the selector
		return;
	}
	curSize = nextSize;
	await loadSprites();
	setStatus(`Managing ${curSize}/`);
});

$("#zoom-in").addEventListener("click", () => zoom(1));
$("#zoom-out").addEventListener("click", () => zoom(-1));
// Integer zoom steps only: each 64px source pixel maps to a whole number of
// screen pixels, so no smoothing/uneven pixels can appear.
function zoom(d) {
	const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--zoom"));
	const next = Math.min(6, Math.max(1, Math.round(cur + d)));
	document.documentElement.style.setProperty("--zoom", next);
	document.documentElement.style.setProperty("--tile", `${64 * next}px`);
}
// Export selected sprites of the current size folder as a compact
// square-ish grid PNG (native tile size), saved server-side through
// POST /spritesheets.
$("#sheet-btn").addEventListener("click", async () => {
	const raw = await prompt("Spritesheet name (kebab-case):", { okText: "Export" });
	if (raw === null) return;
	const kebabName = kebab(raw) === "sprite" ? "" : kebab(raw);
	if (!kebabName) {
		setStatus("Export cancelled: invalid name");
		return;
	}
	const side = Number.parseInt(curSize, 10);
	const names = order.filter((n) => selected.has(n));
	const cols = Math.ceil(Math.sqrt(names.length));
	const rows = Math.ceil(names.length / cols);
	const canvas = document.createElement("canvas");
	canvas.width = cols * side;
	canvas.height = rows * side;
	const ctx = canvas.getContext("2d");
	try {
		const images = await Promise.all(
			names.map((n) => loadImage(`/${curSize}/${encodeURIComponent(n)}`))
		);
		images.forEach((img, i) => {
			ctx.drawImage(img, (i % cols) * side, Math.floor(i / cols) * side);
		});
	} catch (error) {
		setStatus(`Export failed: ${error.message}`);
		return;
	}
	const name = `${kebabName}-spritesheet.png`;
	const res = await fetch("/spritesheets", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ name, dataUrl: canvas.toDataURL("image/png") })
	});
	const body = await res.json();
	setStatus(
		res.ok ? `Saved ${body.file} (${cols}x${rows} grid)` : `Spritesheet save failed: ${body.error}`
	);
});

/**
 * Generate tab — AI sprite generation through the local server.
 *
 * Flow: pick a model, type a prompt, Generate → ONE request to the server
 * (Vercel AI Gateway, AI_GATEWAY_API_KEY stays server-side) returns the
 * model's native PNG. The browser downscales it to the 128×128 master
 * grid on a hidden canvas (nearest-neighbor, imageSmoothingEnabled =
 * false) and derives the 64×64 and 32×32 grids from it — all three are
 * shown at once, each with its own Save. While generating, the grids are
 * cleared and a bare countdown shows the remaining time. The last 10
 * prompts are kept in localStorage
 * and recalled with ↑/↓ inside the prompt input (shell-style history).
 * Errors are displayed in a full-width bar at the bottom of the page.
 * Save asks for the kebab name with the styled prompt() modal, re-encodes
 * that grid's canvas, and POSTs it to /generate/save (server computes the
 * next gapless NNN per size folder).
 */
const genModel = $("#gen-model");
const genPrompt = $("#gen-prompt");
const genHint = $("#gen-hint");
const genGo = $("#gen-go");
const genSave = $("#gen-save");
const genLoader = $("#gen-loader");
const genError = $("#gen-error");
const genClean = $("#gen-clean");
// Pending undo of a background removal on the master canvas; a new
// generation or cell navigation invalidates it (undo does not survive
// the image it was made from).
let genCleanUndo: (() => void) | null = null;

// Grid declaration: common presets plus a free "cols x rows" custom entry.
// The declaration is changeable at any time — including after a generation —
// and re-slices the in-memory image for free (no new paid call). 1×1 renders
// the full image. The hint field is user-owned: never auto-filled.
type Grid = { cols: number; rows: number };
const GRID_RE = /^(\d{1,2})\s*[x×]\s*(\d{1,2})$/;
const genGridSel = $("#gen-grid");
const genGridCustom = genGridSel.querySelector('option[value="custom"]');
let genGrid: Grid = { cols: 1, rows: 1 };
function parseGrid(raw: string): Grid | null {
	const m = GRID_RE.exec(raw.trim());
	if (!m) return null;
	const cols = Number(m[1]);
	const rows = Number(m[2]);
	return cols >= 1 && cols <= 16 && rows >= 1 && rows <= 16 ? { cols, rows } : null;
}
// Keep the dropdown label on the active grid: presets select their option,
// custom grids reuse the "Custom…" option showing the exact dimensions.
function syncGridSelect() {
	const label = `${genGrid.cols}x${genGrid.rows}`;
	const preset = [...genGridSel.options].find((o) => o.value === label);
	if (preset) {
		genGridSel.value = label;
	} else {
		genGridCustom.textContent = label;
		genGridSel.value = "custom";
	}
}
function applyGrid(g: Grid) {
	genGrid = g;
	cellIndex = 0;
	panX = 0;
	panY = 0;
	// Interim bridge: the render model still keys on a square sheetGrid.
	sheetGrid = g.cols === 1 && g.rows === 1 ? null : g.cols;
	renderCurrentCell();
	syncSheetNav();
}
genGridSel.addEventListener("change", async () => {
	if (genGridSel.value !== "custom") {
		const g = parseGrid(genGridSel.value);
		if (g) applyGrid(g);
		return;
	}
	const raw = await prompt("Grid as columns x rows (e.g. 4x5):", { okText: "Apply" });
	const g = raw === null ? null : parseGrid(raw);
	if (g) {
		applyGrid(g);
	} else if (raw !== null) {
		await confirm("Use the columns x rows format, e.g. 4x5 (1–16 per axis).", {
			okText: "Got it",
			level: "warning"
		});
	}
	syncGridSelect(); // cancel/invalid keeps the previous grid
});
// master grid: every size is derived from this 128×128 canvas
const MASTER = 128;
const genDown = document.createElement("canvas");
const genCanvases = {
	"128x128": $("#gen-canvas-128"),
	"64x64": $("#gen-canvas-64"),
	"32x32": $("#gen-canvas-32")
};
let genBusy = false;

// Shell-style ↑/↓ history recall, shared by the prompt and hint inputs.
// Each input gets its own 10-entry localStorage history (independent keys).
// Moving back stashes the in-progress text (if any) so ArrowDown can
// restore it; typing resets the browse position.
function makeHistoryRecall(input: HTMLInputElement, storageKey: string) {
	const load = () => {
		try {
			return JSON.parse(localStorage.getItem(storageKey)) ?? [];
		} catch {
			return [];
		}
	};
	const push = (text) => {
		const next = [text, ...load().filter((p) => p !== text)].slice(0, 10);
		localStorage.setItem(storageKey, JSON.stringify(next));
	};
	let index = null; // position in load(), null = not browsing
	let savedText = null; // text being typed before ↑ was pressed
	input.addEventListener("input", () => {
		index = null;
		savedText = null;
	});
	input.addEventListener("keydown", (e) => {
		if (e.key === "ArrowUp") {
			const history = load();
			if (history.length === 0) return;
			if (index === null) {
				// entering history: stash what is being typed (if non-empty)
				const current = input.value.trim();
				if (current) savedText = current;
				index = 0;
			} else if (index < history.length - 1) {
				index++;
			} else {
				return; // already at the oldest entry
			}
			input.value = history[index];
			e.preventDefault();
		} else if (e.key === "ArrowDown" && index !== null) {
			if (index > 0) {
				index--;
				input.value = load()[index];
			} else {
				// back to the present: restore the stashed text
				index = null;
				input.value = savedText ?? "";
				savedText = null;
			}
			e.preventDefault();
		}
	});
	return { push };
}
const promptHistory = makeHistoryRecall(genPrompt, "generate-prompt-history");
const hintHistory = makeHistoryRecall(genHint, "generate-hint-history");

function showGenError(message) {
	genError.textContent = message;
	genError.classList.add("visible");
}
function clearGenError() {
	genError.textContent = "";
	genError.classList.remove("visible");
}

// Tab switching: each tab loads its own data on activation.
let spritesLoaded = false;
let modelsLoaded = false;
function showTab(id) {
	const curate = id === "curate";
	$("#curate-panel").hidden = !curate;
	$("#generate-panel").hidden = curate;
	$("#tab-curate").classList.toggle("active", curate);
	$("#tab-generate").classList.toggle("active", !curate);
	// Anchor the active tab in the URL (no history entry) so a reload
	// restores the last visited tab; "curate" is exposed as #organize.
	history.replaceState(null, "", curate ? "#organize" : "#generate");
	if (curate) {
		clearGenError();
		if (!spritesLoaded) {
			spritesLoaded = true;
			loadSprites();
		}
	} else if (!modelsLoaded) {
		modelsLoaded = true;
		loadModels();
	}
}
$("#tab-curate").addEventListener("click", () => showTab("curate"));
$("#tab-generate").addEventListener("click", () => showTab("generate"));

// Populate the model dropdown: favorites first (flagged in the label).
// Generation timeout advertised by the server (drives the countdown).
let genTimeoutMs = 30_000;
async function loadModels() {
	const res = await fetch("/generate/models", { cache: "no-store" });
	const body = await res.json();
	genTimeoutMs = body.timeoutMs ?? genTimeoutMs;
	genModel.innerHTML = "";
	for (const m of body.models) {
		const opt = document.createElement("option");
		opt.value = m.id;
		opt.textContent = m.favorite ? `★ ${m.id}` : m.id;
		genModel.appendChild(opt);
	}
	if (body.models.length === 0)
		setStatus("No image models available — check AI_GATEWAY_API_KEY / FAVORITE_IMAGE_MODELS");
}

// Derive the three size renditions from the current master canvas
// (nearest-neighbor). Used after generation AND after a background
// removal/undo, so every rendition always mirrors the master.
function deriveRenditions() {
	for (const [size, canvas] of Object.entries(genCanvases)) {
		const side = Number.parseInt(size, 10);
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;
		ctx.clearRect(0, 0, side, side);
		ctx.drawImage(genDown, 0, 0, side, side);
	}
}

// Downscale the model image to the 128×128 master canvas (nearest-
// neighbor), then derive the smaller grids from it (each canvas keeps its
// exact grid resolution; CSS scales them up with image-rendering: pixelated).
// Single mode: the model image IS the sprite.
function drawDownscaled(src: string) {
	return loadImage(src).then((img) => {
		genDown.width = MASTER;
		genDown.height = MASTER;
		const mctx = genDown.getContext("2d");
		if (!mctx) return;
		mctx.imageSmoothingEnabled = false; // nearest-neighbor downscale
		mctx.clearRect(0, 0, MASTER, MASTER);
		mctx.drawImage(img, 0, 0, MASTER, MASTER);
		genCleanUndo = null; // new image: previous undo is stale
		genClean.textContent = "Remove background";
		deriveRenditions();
	});
}

// Sheet mode: the full 1024×1024 model image is kept in an offscreen canvas
// and sliced row-major into 4×4 (256px) or 8×8 (128px) cells. The current
// cell is drawn into the master canvas with the same nearest-neighbor path
// as single mode; navigation (prev/next) just re-renders another cell.
const SHEET_SIDE = 1024;
const sheetCanvas = document.createElement("canvas");
let sheetGrid: number | null = null; // cells per row when a sheet is loaded, null in single mode
let cellIndex = 0; // 0-based, row-major
// Sampling-viewport pan for the 128 display (sheet mode): the source rect is
// shifted inside the sheet, clamped to ±half a cell so a neighbor's bleed can
// be pulled back (see renderCurrentCell).
let panX = 0;
let panY = 0;

function renderCurrentCell() {
	if (sheetGrid === null) return; // 1×1 has nothing to slice
	const perRow = sheetGrid;
	const side = SHEET_SIDE / perRow;
	const col = cellIndex % perRow;
	const row = Math.floor(cellIndex / perRow);
	// Same nearest-neighbor path as single mode, cropping the sheet at the
	// current cell's source rectangle. The master is only sized by
	// drawDownscaled (single mode); a fresh page's first sheet generation
	// would otherwise draw into a default 300×150 canvas — squeezed
	// renditions and a transparent band.
	genDown.width = MASTER;
	genDown.height = MASTER;
	const mctx = genDown.getContext("2d");
	if (!mctx) return;
	mctx.imageSmoothingEnabled = false;
	mctx.clearRect(0, 0, MASTER, MASTER);
	// clamp to ±half a cell so bleed from a neighbor can be pulled back
	const max = side / 2;
	const offX = Math.max(-max, Math.min(max, panX));
	const offY = Math.max(-max, Math.min(max, panY));
	mctx.drawImage(
		sheetCanvas,
		col * side + offX,
		row * side + offY,
		side,
		side,
		0,
		0,
		MASTER,
		MASTER
	);
	deriveRenditions();
}

// Store a generated sheet and render its first cell.
async function loadSheet(dataUrl: string) {
	const img = await loadImage(dataUrl);
	sheetCanvas.width = SHEET_SIDE;
	sheetCanvas.height = SHEET_SIDE;
	const sctx = sheetCanvas.getContext("2d");
	if (!sctx) return;
	sctx.drawImage(img, 0, 0, SHEET_SIDE, SHEET_SIDE);
	// Interim bridge: the render model still keys on a square sheetGrid.
	sheetGrid = genGrid.cols === 1 && genGrid.rows === 1 ? null : genGrid.cols;
	cellIndex = 0;
	panX = 0;
	panY = 0;
	// New sheet: a pending undo refers to the previous sheet's pixels.
	genCleanUndo = null;
	genClean.textContent = "Remove background";
	renderCurrentCell();
	syncSheetNav();
}

// Countdown from the server timeout while a generation is in flight.
let countdownTimer = null;
function startCountdown() {
	let remaining = Math.round(genTimeoutMs / 1000);
	$("#gen-countdown").textContent = String(remaining);
	clearInterval(countdownTimer);
	countdownTimer = setInterval(() => {
		remaining--;
		$("#gen-countdown").textContent = String(Math.max(remaining, 0));
		if (remaining <= 0) clearInterval(countdownTimer);
	}, 1000);
}
function stopCountdown() {
	clearInterval(countdownTimer);
	countdownTimer = null;
}

// Blank all three grids (used while a generation is in flight).
function clearGenGrids() {
	for (const [size, canvas] of Object.entries(genCanvases)) {
		const side = Number.parseInt(size, 10);
		canvas.getContext("2d").clearRect(0, 0, side, side);
	}
}

genGo.addEventListener("click", async () => {
	if (genBusy) return;
	// The hint carries the rendition details (grid layout, background,
	// style); the submitted prompt is subject + hint combined client-side.
	// Empty hint → today's exact request body.
	const subject = genPrompt.value.trim();
	const hint = genHint.value.trim();
	const finalPrompt = hint ? `${subject}. ${hint}` : subject;
	if (!subject) {
		setStatus("Enter a prompt first");
		return;
	}
	if (!checkedSizes().length) {
		setStatus("Check at least one size");
		return;
	}
	genBusy = true;
	genGo.disabled = true;
	genSave.disabled = true;
	genClean.disabled = true;
	clearGenGrids(); // blank the previous sprites while generating
	genLoader.hidden = false;
	startCountdown();
	clearGenError();
	setStatus("Generating…");
	try {
		// one request: the 128×128 master is generated, checked grids are
		// derived client-side (smaller sizes are downscales of the master)
		const res = await fetch("/generate", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ model: genModel.value, prompt: finalPrompt })
		});
		const body = await res.json();
		if (!res.ok) {
			showGenError(body.error);
			setStatus("Generation failed");
			return;
		}
		if (genGrid.cols === 1 && genGrid.rows === 1) {
			await drawDownscaled(`data:image/png;base64,${body.image}`);
		} else {
			// sheet mode: keep the full image in memory and show cell 1
			await loadSheet(`data:image/png;base64,${body.image}`);
		}
		genSave.disabled = false;
		genClean.disabled = false;
		promptHistory.push(subject);
		if (hint) hintHistory.push(hint);
		setStatus(`Generated with ${body.model} — Save writes the checked size(s)`);
	} catch (error) {
		showGenError(error.message);
		setStatus("Generation failed");
	} finally {
		genBusy = false;
		genGo.disabled = false;
		genLoader.hidden = true;
		stopCountdown();
	}
});

// Sizes currently checked in the panel, master last so Save derives the
// smaller ones in a stable order.
function checkedSizes() {
	const sizes = [];
	if ($("#gen-size-32").checked) sizes.push("32x32");
	if ($("#gen-size-64").checked) sizes.push("64x64");
	if ($("#gen-size-128").checked) sizes.push("128x128");
	return sizes;
}

// Sheet navigation: prev/next cycle with wrap-around; the counter shows the
// 1-based position. The bar is only visible in sheet mode.
const genSheetNav = $("#gen-sheetnav");
const genCellPos = $("#gen-cellpos");
function syncSheetNav() {
	$("#gen-canvas-128").classList.toggle("sheet-mode", sheetGrid !== null);
	if (sheetGrid === null) {
		genSheetNav.hidden = true;
		return;
	}
	genSheetNav.hidden = false;
	genCellPos.textContent = `${cellIndex + 1}/${sheetGrid * sheetGrid}`;
}
function cycleCell(step: number) {
	if (sheetGrid === null) return;
	const count = sheetGrid * sheetGrid;
	cellIndex = (cellIndex + step + count) % count; // wrap both directions
	panX = 0;
	panY = 0;
	renderCurrentCell();
	syncSheetNav();
}
$("#gen-prev").addEventListener("click", () => cycleCell(-1));
$("#gen-next").addEventListener("click", () => cycleCell(1));

// Drag-to-recenter (sheet mode only): grabbing the 128 display pans the
// cell's sampling viewport inside the sheet. Grab metaphor — the content
// follows the cursor, so the source rect moves opposite to the pointer;
// CSS-pixel deltas are scaled into sheet pixels. The offset is clamped in
// renderCurrentCell and resets on cell change / new generation.
const genCanvas128 = $("#gen-canvas-128");
let dragStart: { x: number; y: number; panX: number; panY: number } | null = null;
genCanvas128.addEventListener("pointerdown", (e: PointerEvent) => {
	if (sheetGrid === null) return;
	dragStart = { x: e.clientX, y: e.clientY, panX, panY };
	try {
		genCanvas128.setPointerCapture(e.pointerId);
	} catch {
		// pointer already gone (e.g. released outside the window)
	}
	genCanvas128.classList.add("panning");
});
genCanvas128.addEventListener("pointermove", (e: PointerEvent) => {
	if (dragStart === null || sheetGrid === null) return;
	const scale = SHEET_SIDE / sheetGrid / genCanvas128.clientWidth;
	panX = dragStart.panX - (e.clientX - dragStart.x) * scale;
	panY = dragStart.panY - (e.clientY - dragStart.y) * scale;
	renderCurrentCell();
});
const endPan = () => {
	dragStart = null;
	genCanvas128.classList.remove("panning");
};
genCanvas128.addEventListener("pointerup", endPan);
genCanvas128.addEventListener("pointercancel", endPan);

// Show/hide the grids according to the size checkboxes.
for (const id of ["gen-size-32", "gen-size-64", "gen-size-128"]) {
	$(`#${id}`).addEventListener("change", syncGrids);
}
function syncGrids() {
	for (const block of document.querySelectorAll(".gen-grid")) {
		const size = block.dataset.size;
		const checkbox = $(`#gen-size-${size.split("x")[0]}`);
		block.classList.toggle("off", !checkbox.checked);
	}
}
syncGrids();

// Clean the background ONCE at the source: the full sheet canvas in sheet
// mode (every cell is then re-rendered clean from it), the master canvas in
// single mode. Renditions always follow. Clicking again undoes: the source
// is restored and everything re-rendered.
genClean.addEventListener("click", () => {
	if (genClean.disabled) return;
	const inSheetMode = sheetGrid !== null;
	if (genCleanUndo) {
		genCleanUndo();
		genCleanUndo = null;
		genClean.textContent = "Remove background";
		setStatus("Background restored");
	} else {
		genCleanUndo = removeBackground(inSheetMode ? sheetCanvas : genDown);
		genClean.textContent = "Undo background removal";
		setStatus("Background removed");
	}
	inSheetMode ? renderCurrentCell() : deriveRenditions();
});

// Mini prompt for the sprite name; on confirm every checked grid's canvas
// is re-encoded and saved under the same name (next gapless number of
// each size folder).
genSave.addEventListener("click", async () => {
	if (genSave.disabled) return;
	const name = await prompt("Sprite name (kebab-case, number is automatic):", {
		okText: "Save"
	});
	if (!name) return; // cancelled
	const sizes = checkedSizes();
	const saved = [];
	for (const size of sizes) {
		const res = await fetch("/generate/save", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				size,
				name,
				dataUrl: genCanvases[size].toDataURL("image/png")
			})
		});
		const body = await res.json();
		if (!res.ok) {
			showGenError(`Save failed (${size}): ${body.error}`);
			break;
		}
		saved.push(body.file);
	}
	if (saved.length > 0) setStatus(`Saved ${saved.join(", ")}`);
});

// Restore the tab from the URL anchor (#organize / #generate) and load only
// its data on load; the other tab loads on first activation.
showTab(location.hash === "#organize" ? "curate" : "generate");
