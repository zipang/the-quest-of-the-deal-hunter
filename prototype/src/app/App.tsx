import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
	MapPin,
	Zap,
	ChevronLeft,
	ChevronRight,
	Camera,
	Plus,
	X,
	Search,
	LogOut
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type ScreenId = "setup" | "add-item" | "quest" | "shop" | "item-select" | "found-log" | "review";
type Category = "figurines" | "cameras" | "vintage" | "electronics";
type Condition = "MINT" | "GOOD" | "FAIR" | "POOR";
type NavAnim = "forward" | "backward" | "instant";

interface QuestItem {
	id: string;
	name: string;
	desc: string;
	category: Category;
	budget: number;
}
interface Shop {
	id: string;
	name: string;
	district: string;
	type: string;
	distance: string;
	categories: Category[];
	visited: boolean;
	findsCount: number;
	hasPhoto: boolean;
}
interface Find {
	id: string;
	questItemId: string;
	shopId: string;
	shopName: string;
	itemName: string;
	category: Category;
	price: number;
	condition: Condition;
	notes: string;
	hasPhoto: boolean;
	timestamp: string;
}
interface SpecialFx {
	type: "shatter" | "glitch";
	dest: ScreenId;
}
interface SpriteRect {
	x: number;
	y: number;
	w: number;
	h: number;
	c: number;
}

// ── Config ─────────────────────────────────────────────────────────────────────
const CAT: Record<Category, { emoji: string; label: string; color: string; bg: string }> = {
	figurines: { emoji: "🎌", label: "FIGURINES", color: "#ff006e", bg: "rgba(255,0,110,0.12)" },
	cameras: { emoji: "📷", label: "CAMERAS", color: "#00b4d8", bg: "rgba(0,180,216,0.12)" },
	vintage: { emoji: "👕", label: "VINTAGE", color: "#ff9500", bg: "rgba(255,149,0,0.12)" },
	electronics: { emoji: "⚡", label: "ELECTRONICS", color: "#00ff9f", bg: "rgba(0,255,159,0.12)" }
};
const COND: Record<Condition, { stars: string; color: string }> = {
	MINT: { stars: "★★★★★", color: "#00ff9f" },
	GOOD: { stars: "★★★★☆", color: "#00b4d8" },
	FAIR: { stars: "★★★☆☆", color: "#ff9500" },
	POOR: { stars: "★★☆☆☆", color: "#ff006e" }
};
const ALL_SHOPS = [
	{
		id: "s1",
		name: "AKIBA TREASURES",
		district: "Akihabara",
		type: "Collectibles",
		distance: "280m",
		categories: ["figurines", "electronics"] as Category[]
	},
	{
		id: "s2",
		name: "RETRO FOTO KAN",
		district: "Shinjuku",
		type: "Photography",
		distance: "650m",
		categories: ["cameras", "vintage"] as Category[]
	},
	{
		id: "s3",
		name: "VINTAGE HAUL CO",
		district: "Harajuku",
		type: "Thrift & Vintage",
		distance: "1.1km",
		categories: ["vintage"] as Category[]
	},
	{
		id: "s4",
		name: "GEAR DUNGEON",
		district: "Shibuya",
		type: "Electronics",
		distance: "1.5km",
		categories: ["electronics", "cameras"] as Category[]
	},
	{
		id: "s5",
		name: "OTAKU SHRINE",
		district: "Nakano",
		type: "Anime & Figures",
		distance: "1.9km",
		categories: ["figurines"] as Category[]
	},
	{
		id: "s6",
		name: "FLASHBACK FOTO",
		district: "Shimokita",
		type: "Photo & Vintage",
		distance: "2.3km",
		categories: ["cameras", "vintage"] as Category[]
	}
];
const BACK_MAP: Partial<Record<ScreenId, { dest: ScreenId; fx: "backward" | "glitch" }>> = {
	"add-item": { dest: "setup", fx: "backward" },
	quest: { dest: "setup", fx: "backward" },
	shop: { dest: "quest", fx: "backward" },
	"item-select": { dest: "shop", fx: "backward" },
	"found-log": { dest: "item-select", fx: "glitch" },
	review: { dest: "quest", fx: "backward" }
};
const PX = { fontFamily: "'Press Start 2P', monospace" } as const;
const VT = { fontFamily: "'VT323', monospace" } as const;
const RJ = { fontFamily: "'Rajdhani', sans-serif" } as const;

// ══════════════════════════════════════════════════════════════════════════════
// PIXEL ART SYSTEM — 16-color palette, 32×32 sprites rendered to <canvas>
// ══════════════════════════════════════════════════════════════════════════════

// 16 colors (index 0 = transparent, 1-15 = opaque)
const PALETTE: (string | null)[] = [
	null, // 0  transparent
	"#0a0a18", // 1  dark outline
	"#ffcc88", // 2  skin light
	"#e8a860", // 3  skin shadow
	"#ffffff", // 4  white / eye highlight
	"#006633", // 5  hat dark green
	"#00ff9f", // 6  hat bright / shoes
	"#0f0f28", // 7  jacket / pants dark
	"#2a2a50", // 8  jacket mid
	"#ff006e", // 9  pink accent
	"#ffc800", // 10 gold main
	"#aa6600", // 11 gold dark
	"#ffee88", // 12 gold highlight
	"#664422", // 13 brown (eyebrow)
	"#cc7744", // 14 warm / mouth
	"#00cc80" // 15 hat mid green
];

function makeFrame(rects: SpriteRect[]): Uint8Array {
	const data = new Uint8Array(32 * 32); // default 0 = transparent
	for (const r of rects) {
		for (let dy = 0; dy < r.h; dy++) {
			for (let dx = 0; dx < r.w; dx++) {
				const px = r.x + dx,
					py = r.y + dy;
				if (px >= 0 && px < 32 && py >= 0 && py < 32) data[py * 32 + px] = r.c;
			}
		}
	}
	return data;
}

function PixelSprite({
	frames,
	fps = 4,
	scale = 5
}: {
	frames: Uint8Array[];
	fps?: number;
	scale?: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameRef = useRef(0);
	const size = 32;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d")!;
		ctx.imageSmoothingEnabled = false;

		const draw = () => {
			const frame = frames[frameRef.current % frames.length];
			ctx.clearRect(0, 0, size * scale, size * scale);
			for (let i = 0; i < frame.length; i++) {
				const col = PALETTE[frame[i]];
				if (!col) continue;
				ctx.fillStyle = col;
				ctx.fillRect((i % size) * scale, Math.floor(i / size) * scale, scale, scale);
			}
		};

		draw();
		if (frames.length <= 1) return;
		const timer = setInterval(() => {
			frameRef.current = (frameRef.current + 1) % frames.length;
			draw();
		}, 1000 / fps);
		return () => clearInterval(timer);
	}, [frames, fps, scale]);

	return (
		<canvas
			ref={canvasRef}
			width={size * scale}
			height={size * scale}
			style={{ imageRendering: "pixelated", display: "block" }}
		/>
	);
}

// ── CHALICE SPRITE (32×32) ────────────────────────────────────────────────────
const CHALICE_FRAME: Uint8Array = makeFrame([
	// Rim top highlight
	{ x: 6, y: 3, w: 20, h: 1, c: 12 },
	// Rim body
	{ x: 6, y: 4, w: 20, h: 2, c: 10 },
	// Rim bottom edge
	{ x: 6, y: 6, w: 20, h: 1, c: 11 },
	// Cup outer left wall
	{ x: 6, y: 7, w: 2, h: 9, c: 10 },
	// Cup outer right wall (shadow)
	{ x: 24, y: 7, w: 2, h: 9, c: 11 },
	// Cup interior fill
	{ x: 8, y: 7, w: 16, h: 9, c: 11 },
	// Interior left highlight strip
	{ x: 8, y: 7, w: 2, h: 9, c: 12 },
	// Liquid glint (top of cup)
	{ x: 10, y: 8, w: 10, h: 2, c: 12 },
	// Cup bottom edge
	{ x: 6, y: 16, w: 20, h: 1, c: 10 },
	// Stem
	{ x: 14, y: 17, w: 4, h: 7, c: 10 },
	// Stem highlight
	{ x: 15, y: 17, w: 2, h: 7, c: 12 },
	// Stem left shadow
	{ x: 14, y: 17, w: 1, h: 7, c: 11 },
	// Base connector
	{ x: 12, y: 24, w: 8, h: 1, c: 10 },
	// Base highlight top
	{ x: 6, y: 25, w: 20, h: 1, c: 12 },
	// Base main
	{ x: 6, y: 26, w: 20, h: 2, c: 10 },
	// Base bottom shadow
	{ x: 6, y: 28, w: 20, h: 1, c: 11 },
	// Base outline
	{ x: 7, y: 29, w: 18, h: 1, c: 1 },
	// Extra shine on base left
	{ x: 7, y: 25, w: 4, h: 1, c: 4 }
]);

// ── EXPLORER CHARACTER SPRITE (32×32, animated) ───────────────────────────────
const CHAR_BASE: SpriteRect[] = [
	// Hat crown (dark green)
	{ x: 10, y: 1, w: 12, h: 3, c: 5 },
	// Hat crown mid highlight
	{ x: 11, y: 1, w: 10, h: 1, c: 15 },
	// Hat brim (bright green)
	{ x: 7, y: 4, w: 18, h: 2, c: 6 },
	// Brim top shine
	{ x: 7, y: 4, w: 18, h: 1, c: 4 },
	// Head skin block
	{ x: 10, y: 6, w: 12, h: 11, c: 2 },
	// Head left/right outline
	{ x: 9, y: 6, w: 1, h: 10, c: 1 },
	{ x: 22, y: 6, w: 1, h: 10, c: 1 },
	// Chin shadow
	{ x: 10, y: 15, w: 12, h: 1, c: 3 },
	// Left cheek blush
	{ x: 9, y: 12, w: 2, h: 2, c: 3 },
	{ x: 21, y: 12, w: 2, h: 2, c: 3 },
	// Eyebrows
	{ x: 11, y: 7, w: 3, h: 1, c: 13 },
	{ x: 18, y: 7, w: 3, h: 1, c: 13 },
	// Eye whites
	{ x: 11, y: 8, w: 3, h: 3, c: 4 },
	{ x: 18, y: 8, w: 3, h: 3, c: 4 },
	// Mouth
	{ x: 13, y: 13, w: 6, h: 1, c: 14 },
	{ x: 14, y: 14, w: 4, h: 1, c: 3 },
	// Jacket outline
	{ x: 8, y: 17, w: 16, h: 8, c: 1 },
	// Jacket dark fill
	{ x: 9, y: 17, w: 14, h: 8, c: 7 },
	// Jacket lighter interior
	{ x: 10, y: 18, w: 12, h: 6, c: 8 },
	// Skin collar
	{ x: 14, y: 17, w: 4, h: 1, c: 2 },
	// Gold button
	{ x: 15, y: 19, w: 2, h: 2, c: 10 },
	// Left leg
	{ x: 9, y: 25, w: 5, h: 5, c: 1 },
	{ x: 10, y: 25, w: 4, h: 5, c: 7 },
	// Right leg
	{ x: 18, y: 25, w: 5, h: 5, c: 1 },
	{ x: 18, y: 25, w: 4, h: 5, c: 7 },
	// Left shoe
	{ x: 8, y: 30, w: 7, h: 2, c: 6 },
	{ x: 8, y: 30, w: 4, h: 1, c: 4 },
	// Right shoe
	{ x: 17, y: 30, w: 7, h: 2, c: 6 },
	{ x: 17, y: 30, w: 4, h: 1, c: 4 }
];

const pupils = {
	center: [
		{ x: 12, y: 9, w: 2, h: 2, c: 1 },
		{ x: 19, y: 9, w: 2, h: 2, c: 1 }
	],
	left: [
		{ x: 11, y: 9, w: 2, h: 2, c: 1 },
		{ x: 18, y: 9, w: 2, h: 2, c: 1 }
	],
	right: [
		{ x: 13, y: 9, w: 2, h: 2, c: 1 },
		{ x: 20, y: 9, w: 2, h: 2, c: 1 }
	],
	blink: [
		// cover eyes with skin
		{ x: 11, y: 8, w: 3, h: 3, c: 2 },
		{ x: 18, y: 8, w: 3, h: 3, c: 2 },
		// thin eyelid line
		{ x: 11, y: 9, w: 3, h: 1, c: 1 },
		{ x: 18, y: 9, w: 3, h: 1, c: 1 }
	]
};

// ── POLAROID HELD BY HAND SPRITE (32×32) ─────────────────────────────────────
const POLAROID_FRAME: Uint8Array = makeFrame([
	// Drop shadow (offset 1px right+down)
	{ x: 4, y: 1, w: 24, h: 24, c: 1 },
	// Polaroid body (white)
	{ x: 3, y: 0, w: 24, h: 24, c: 4 },
	// Polaroid border outline
	{ x: 3, y: 0, w: 24, h: 1, c: 8 }, // top
	{ x: 3, y: 0, w: 1, h: 24, c: 8 }, // left
	{ x: 26, y: 0, w: 1, h: 24, c: 8 }, // right
	{ x: 3, y: 23, w: 24, h: 1, c: 8 }, // bottom
	// Photo area (dark bg)
	{ x: 5, y: 2, w: 20, h: 14, c: 7 },
	// Sky (slightly lighter)
	{ x: 5, y: 2, w: 20, h: 7, c: 8 },
	// Ground
	{ x: 5, y: 9, w: 20, h: 7, c: 1 },
	// Building silhouettes
	{ x: 6, y: 6, w: 3, h: 3, c: 1 },
	{ x: 11, y: 5, w: 4, h: 4, c: 1 },
	{ x: 20, y: 7, w: 3, h: 2, c: 1 },
	// Found item glowing in photo (golden)
	{ x: 14, y: 6, w: 4, h: 4, c: 10 },
	{ x: 15, y: 7, w: 2, h: 2, c: 12 },
	// Flash corner highlight
	{ x: 22, y: 3, w: 2, h: 2, c: 12 },
	// Writing strip (already white from body) — lines for text
	{ x: 6, y: 17, w: 15, h: 1, c: 8 },
	{ x: 6, y: 19, w: 10, h: 1, c: 8 },
	// Hand — palm gripping from below
	{ x: 5, y: 21, w: 22, h: 8, c: 2 },
	{ x: 5, y: 21, w: 22, h: 1, c: 3 }, // hand top shadow
	// Thumb (left side)
	{ x: 3, y: 22, w: 3, h: 6, c: 2 },
	{ x: 3, y: 22, w: 3, h: 1, c: 3 },
	// Four fingers peeking at bottom
	{ x: 6, y: 28, w: 3, h: 3, c: 2 },
	{ x: 11, y: 28, w: 3, h: 3, c: 2 },
	{ x: 16, y: 28, w: 3, h: 3, c: 2 },
	{ x: 21, y: 28, w: 3, h: 3, c: 2 },
	// Finger tip shadows
	{ x: 6, y: 30, w: 3, h: 1, c: 3 },
	{ x: 11, y: 30, w: 3, h: 1, c: 3 },
	{ x: 16, y: 30, w: 3, h: 1, c: 3 },
	{ x: 21, y: 30, w: 3, h: 1, c: 3 }
]);

const CHAR_FRAMES: Uint8Array[] = [
	makeFrame([...CHAR_BASE, ...pupils.center]),
	makeFrame([...CHAR_BASE, ...pupils.left]),
	makeFrame([...CHAR_BASE, ...pupils.center]),
	makeFrame([...CHAR_BASE, ...pupils.center]),
	makeFrame([...CHAR_BASE, ...pupils.right]),
	makeFrame([...CHAR_BASE, ...pupils.center]),
	makeFrame([...CHAR_BASE, ...pupils.blink]),
	makeFrame([...CHAR_BASE, ...pupils.center])
];

// ── Glass shards — deterministic ───────────────────────────────────────────────
const SHARDS = (() => {
	const cols = 4,
		rows = 5;
	return Array.from({ length: cols * rows }, (_, i) => {
		const col = i % cols,
			row = Math.floor(i / cols);
		const cx = (col + 0.5) / cols - 0.5;
		const cy = (row + 0.5) / rows - 0.5;
		const mag = Math.sqrt(cx * cx + cy * cy) || 0.01;
		const spd = 220 + ((i * 53) % 160);
		return {
			id: i,
			x: `${(col * 100) / cols + (((i * 3.3) % 6) - 3)}%`,
			y: `${(row * 100) / rows + (((i * 4.7) % 6) - 3)}%`,
			w: `${100 / cols + ((i * 1.7) % 8)}%`,
			h: `${100 / rows + ((i * 2.3) % 6)}%`,
			tx: (cx / mag) * spd + (((i * 17) % 50) - 25),
			ty: (cy / mag) * spd + (((i * 13) % 50) - 25),
			rot: ((i * 47) % 160) - 80,
			delay: 0.05 + i * 0.02
		};
	});
})();

// ── GlassShatter ───────────────────────────────────────────────────────────────
function GlassShatter({ onComplete }: { onComplete: () => void }) {
	useEffect(() => {
		const t = setTimeout(onComplete, 820);
		return () => clearTimeout(t);
	}, [onComplete]);
	return (
		<div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 700 }}>
			<motion.svg
				className="absolute inset-0 w-full h-full"
				viewBox="0 0 390 844"
				preserveAspectRatio="none"
				initial={{ opacity: 1 }}
				animate={{ opacity: 0 }}
				transition={{ delay: 0.04, duration: 0.1 }}
			>
				{[
					[195, 422, 40, 80],
					[195, 422, 355, 65],
					[195, 422, 388, 320],
					[195, 422, 370, 640],
					[195, 422, 205, 844],
					[195, 422, 8, 780],
					[195, 422, 0, 440],
					[195, 422, 12, 180],
					[195, 422, 295, 440],
					[195, 422, 95, 390],
					[195, 422, 198, 0],
					[195, 422, 388, 170]
				].map(([x1, y1, x2, y2], i) => (
					<line
						key={i}
						x1={x1}
						y1={y1}
						x2={x2}
						y2={y2}
						stroke={`rgba(0,255,159,${0.95 - i * 0.06})`}
						strokeWidth={i % 3 === 0 ? "2" : "0.8"}
					/>
				))}
				<circle cx="195" cy="422" r="5" fill="rgba(0,255,159,0.75)" />
				<circle
					cx="195"
					cy="422"
					r="13"
					fill="none"
					stroke="rgba(0,255,159,0.45)"
					strokeWidth="1.5"
				/>
			</motion.svg>
			{SHARDS.map((s) => (
				<motion.div
					key={s.id}
					style={{
						position: "absolute",
						left: s.x,
						top: s.y,
						width: s.w,
						height: s.h,
						background: `linear-gradient(${118 + s.id * 13}deg,rgba(8,8,26,0.98) 0%,rgba(14,14,42,0.99) 100%)`,
						borderTop: `1px solid rgba(0,255,159,${Math.max(0.3 - s.id * 0.01, 0.04)})`,
						borderLeft: `1px solid rgba(0,255,159,${Math.max(0.22 - s.id * 0.01, 0.03)})`
					}}
					initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
					animate={{ x: s.tx, y: s.ty, rotate: s.rot, opacity: 0, scale: 0.3 }}
					transition={{ duration: 0.48, delay: s.delay, ease: [0.18, 0, 0.82, 0.6] }}
				/>
			))}
		</div>
	);
}

// ── GlitchEffect ───────────────────────────────────────────────────────────────
function GlitchEffect({ onComplete }: { onComplete: () => void }) {
	useEffect(() => {
		const t = setTimeout(onComplete, 500);
		return () => clearTimeout(t);
	}, [onComplete]);
	const strips = Array.from({ length: 7 }, (_, i) => ({
		id: i,
		top: `${8 + i * 12}%`,
		height: `${3 + ((i * 3) % 7)}%`,
		shift: (i % 2 === 0 ? 1 : -1) * (10 + i * 5),
		color:
			i % 3 === 0
				? "rgba(255,0,110,0.55)"
				: i % 3 === 1
					? "rgba(0,255,159,0.45)"
					: "rgba(0,180,216,0.5)",
		delay: i * 0.035
	}));
	return (
		<div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 700 }}>
			{[
				{ dx: -8, color: "rgba(255,0,110,0.18)", delay: 0 },
				{ dx: 8, color: "rgba(0,255,159,0.18)", delay: 0.06 },
				{ dx: -4, color: "rgba(0,180,216,0.12)", delay: 0.12 }
			].map((l, i) => (
				<motion.div
					key={i}
					className="absolute inset-0"
					style={{ background: l.color, mixBlendMode: "screen" }}
					animate={{ x: [0, l.dx, -l.dx * 0.6, l.dx * 0.4, 0], opacity: [0, 1, 0.6, 0.9, 0] }}
					transition={{ duration: 0.42, delay: l.delay, times: [0, 0.2, 0.5, 0.75, 1] }}
				/>
			))}
			{strips.map((s) => (
				<motion.div
					key={s.id}
					className="absolute w-full"
					style={{ top: s.top, height: s.height, background: s.color }}
					initial={{ x: 0, opacity: 0 }}
					animate={{
						x: [0, s.shift, -s.shift * 0.5, s.shift * 0.7, 0],
						opacity: [0, 0.95, 0.5, 0.8, 0]
					}}
					transition={{ duration: 0.38, delay: s.delay, times: [0, 0.2, 0.5, 0.75, 1] }}
				/>
			))}
			<motion.div
				className="absolute inset-0"
				style={{ background: "rgba(255,255,255,0.07)" }}
				animate={{ opacity: [0, 1, 0, 0.5, 0, 0.25, 0] }}
				transition={{ duration: 0.44, times: [0, 0.1, 0.22, 0.32, 0.44, 0.5, 1] }}
			/>
			<motion.div
				className="absolute inset-x-0 top-0"
				style={{ height: "2px", background: "#00ff9f" }}
				animate={{ opacity: [0, 1, 0, 1, 0], scaleX: [1, 0.3, 1, 0.5, 0] }}
				transition={{ duration: 0.4, times: [0, 0.1, 0.26, 0.38, 1] }}
			/>
		</div>
	);
}

// ── UI atoms ───────────────────────────────────────────────────────────────────
function XPBar({ xp, maxXp, level }: { xp: number; maxXp: number; level: number }) {
	const pct = maxXp > 0 ? Math.min((xp / maxXp) * 100, 100) : 0;
	return (
		<div className="flex items-center gap-2">
			<span style={{ ...PX, fontSize: "7px", color: "#00ff9f", whiteSpace: "nowrap" }}>
				LV.{level}
			</span>
			<div
				className="flex-1 relative"
				style={{ height: "10px", background: "#151530", border: "1px solid rgba(0,255,159,0.2)" }}
			>
				<motion.div
					className="absolute inset-y-0 left-0"
					animate={{ width: `${pct}%` }}
					transition={{ duration: 0.55, ease: "easeOut" }}
					style={{
						background: "linear-gradient(90deg,#00ff9f,#00ffcc)",
						boxShadow: "0 0 8px #00ff9f"
					}}
				/>
				{Array.from({ length: 10 }).map((_, i) => (
					<div
						key={i}
						className="absolute inset-y-0"
						style={{ left: `${(i + 1) * 10}%`, width: "1px", background: "rgba(10,10,24,0.5)" }}
					/>
				))}
			</div>
			<span style={{ ...VT, fontSize: "15px", color: "#6060a0", whiteSpace: "nowrap" }}>
				{xp}XP
			</span>
		</div>
	);
}

function CatBadge({ cat }: { cat: Category }) {
	return (
		<span
			style={{
				...VT,
				fontSize: "13px",
				color: CAT[cat].color,
				background: CAT[cat].bg,
				padding: "1px 6px",
				border: `1px solid ${CAT[cat].color}44`
			}}
		>
			{CAT[cat].emoji} {CAT[cat].label}
		</span>
	);
}

function PxBox({
	children,
	color = "#00ff9f",
	className = "",
	style = {}
}: {
	children: React.ReactNode;
	color?: string;
	className?: string;
	style?: React.CSSProperties;
}) {
	return (
		<div
			className={className}
			style={{
				background: "#0f0f28",
				border: `1px solid ${color}30`,
				boxShadow: `0 0 10px ${color}12, inset 0 0 6px ${color}06`,
				...style
			}}
		>
			{children}
		</div>
	);
}

// Screen slot used in the 200%-wide transition track
function ScreenSlot({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				width: "50%",
				minHeight: "100svh",
				overflowY: "auto",
				background: "#0a0a18",
				flexShrink: 0
			}}
		>
			{children}
		</div>
	);
}

// Floating question marks above the character
function QuestionMarks() {
	const marks = [
		{ dx: -38, delay: 0, size: 18, color: "#ff006e" },
		{ dx: 5, delay: 0.9, size: 15, color: "#00ff9f" },
		{ dx: 38, delay: 1.7, size: 16, color: "#ffc800" }
	];
	return (
		<>
			{marks.map((m, i) => (
				<motion.span
					key={i}
					style={{
						position: "absolute",
						top: "0px",
						left: `calc(50% + ${m.dx}px)`,
						transform: "translateX(-50%)",
						...PX,
						fontSize: `${m.size}px`,
						color: m.color,
						textShadow: `0 0 10px ${m.color}`,
						pointerEvents: "none",
						zIndex: 2
					}}
					animate={{ y: [0, -50], opacity: [0, 1, 1, 0] }}
					transition={{
						repeat: Infinity,
						duration: 2.2,
						delay: m.delay,
						times: [0, 0.18, 0.65, 1]
					}}
				>
					?
				</motion.span>
			))}
		</>
	);
}

// ══════════════════════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
	// ── Navigation
	const [screen, setScreen] = useState<ScreenId>("setup");
	const [prevScreen, setPrevScreen] = useState<ScreenId | null>(null);
	const [navAnim, setNavAnim] = useState<NavAnim>("forward");
	const [fx, setFx] = useState<SpecialFx | null>(null);
	const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ── Data
	const [questItems, setQuestItems] = useState<QuestItem[]>([]);
	const [shops, setShops] = useState<Shop[]>([]);
	const [finds, setFinds] = useState<Find[]>([]);
	const [xp, setXp] = useState(0);
	const [level, setLevel] = useState(1);
	const [activeShop, setActiveShop] = useState<Shop | null>(null);
	const [shopIdx, setShopIdx] = useState(0);
	const [reviewIdx, setReviewIdx] = useState(0);
	const [selectedQuestItemId, setSelectedQuestItemId] = useState("");

	// ── Overlays
	const [foundAnim, setFoundAnim] = useState(false);
	const [foundLabel, setFoundLabel] = useState("");

	// ── Form drafts
	const [itemDraft, setItemDraft] = useState({
		name: "",
		desc: "",
		category: "figurines" as Category,
		budget: 50
	});
	const [findDraft, setFindDraft] = useState({
		price: "",
		condition: "GOOD" as Condition,
		notes: "",
		hasPhoto: false
	});

	// ── Core navigation (200%-wide track approach for consistent slides)
	const navigate = (dest: ScreenId, anim: NavAnim) => {
		if (slideTimer.current) clearTimeout(slideTimer.current);
		setPrevScreen(screen);
		setNavAnim(anim);
		setScreen(dest);
		slideTimer.current = setTimeout(() => setPrevScreen(null), 360);
	};

	const goForward = (dest: ScreenId) => navigate(dest, "forward");
	const goBack = (dest: ScreenId) => navigate(dest, "backward");
	const goShatter = (dest: ScreenId) => {
		if (slideTimer.current) clearTimeout(slideTimer.current);
		setPrevScreen(null);
		setNavAnim("instant");
		setScreen(dest);
		setFx({ type: "shatter", dest });
	};
	const goGlitch = (dest: ScreenId) => {
		setFx({ type: "glitch", dest });
	};

	const handleBack = () => {
		const entry = BACK_MAP[screen];
		if (!entry) return;
		if (entry.fx === "glitch") goGlitch(entry.dest);
		else goBack(entry.dest);
	};

	const onShatterDone = () => setFx(null);
	const onGlitchDone = () => {
		const dest = fx!.dest;
		setFx(null);
		navigate(dest, "backward");
	};

	// ── XP
	const addXP = (n: number) =>
		setXp((prev) => {
			const nx = prev + n;
			if (nx >= level * 400) setLevel((l) => l + 1);
			return nx;
		});
	const maxXP = Math.max(questItems.length * 600 + 400, 800);

	// ── Handlers
	const handleAddItem = () => {
		if (!itemDraft.name.trim()) return;
		setQuestItems((p) => [
			...p,
			{
				id: `qi-${Date.now()}`,
				name: itemDraft.name.trim(),
				desc: itemDraft.desc,
				category: itemDraft.category,
				budget: itemDraft.budget
			}
		]);
		setItemDraft({ name: "", desc: "", category: "figurines", budget: 50 });
		goBack("setup");
	};

	const handleStartQuest = () => {
		if (!questItems.length) return;
		const cats = new Set(questItems.map((qi) => qi.category));
		const relevant = ALL_SHOPS.filter((s) => s.categories.some((c) => cats.has(c)));
		setShops(
			(relevant.length >= 2 ? relevant : ALL_SHOPS.slice(0, 4)).map((s) => ({
				...s,
				visited: false,
				findsCount: 0,
				hasPhoto: false
			}))
		);
		setShopIdx(0);
		goForward("quest");
	};

	const handleEnterShop = () => {
		const s = shops[shopIdx];
		if (!s) return;
		setActiveShop({ ...s });
		addXP(30);
		goForward("shop");
	};

	const handleExitShop = () => {
		setShops((p) => p.map((s) => (s.id === activeShop?.id ? { ...s, visited: true } : s)));
		goBack("quest");
	};

	const handleShopPhoto = () => {
		if (!activeShop) return;
		setActiveShop((p) => (p ? { ...p, hasPhoto: true } : p));
		setShops((p) => p.map((s) => (s.id === activeShop.id ? { ...s, hasPhoto: true } : s)));
		addXP(25);
	};

	const handleItemSelect = (qiId: string) => {
		setSelectedQuestItemId(qiId);
		setFindDraft({ price: "", condition: "GOOD", notes: "", hasPhoto: false });
		goForward("found-log");
	};

	const handleSaveFind = () => {
		const qi = questItems.find((i) => i.id === selectedQuestItemId);
		if (!activeShop || !qi) return;
		setFinds((p) => [
			...p,
			{
				id: `f-${Date.now()}`,
				questItemId: selectedQuestItemId,
				shopId: activeShop.id,
				shopName: activeShop.name,
				itemName: qi.name,
				category: qi.category,
				price: parseFloat(findDraft.price) || 0,
				condition: findDraft.condition,
				notes: findDraft.notes,
				hasPhoto: findDraft.hasPhoto,
				timestamp: new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
			}
		]);
		setShops((p) =>
			p.map((s) => (s.id === activeShop.id ? { ...s, findsCount: s.findsCount + 1 } : s))
		);
		setFoundLabel(qi.name);
		addXP(500);
		setFindDraft({ price: "", condition: "GOOD", notes: "", hasPhoto: false });
		setSelectedQuestItemId("");
		goShatter("shop");
		setTimeout(() => {
			setFoundAnim(true);
			setTimeout(() => setFoundAnim(false), 3000);
		}, 840);
	};

	const handleNewQuest = () => {
		setQuestItems([]);
		setFinds([]);
		setShops([]);
		setXp(0);
		setLevel(1);
		setActiveShop(null);
		setShopIdx(0);
		goShatter("setup");
	};

	// ── Global back-swipe
	const swipeX = useRef(0);
	const swipeY = useRef(0);
	const onTouchStart = (e: React.TouchEvent) => {
		swipeX.current = e.touches[0].clientX;
		swipeY.current = e.touches[0].clientY;
	};
	const onTouchEnd = (e: React.TouchEvent) => {
		const dx = e.changedTouches[0].clientX - swipeX.current;
		const dy = Math.abs(e.changedTouches[0].clientY - swipeY.current);
		if (dx > 60 && dy < 50 && BACK_MAP[screen]) handleBack();
	};
	const carouselSwipe = (leftFn: () => void, rightFn: () => void) => ({
		onTouchStart,
		onTouchEnd: (e: React.TouchEvent) => {
			e.stopPropagation();
			const dx = e.changedTouches[0].clientX - swipeX.current;
			const dy = Math.abs(e.changedTouches[0].clientY - swipeY.current);
			if (dy > 50) return;
			if (dx < -55) leftFn();
			else if (dx > 55) rightFn();
		}
	});

	// ── Derived
	const shopFinds = finds.filter((f) => f.shopId === activeShop?.id);
	const questProgress = shops.length > 0 ? shops.filter((s) => s.visited).length / shops.length : 0;
	const currentShop = shops[shopIdx];
	const selectedItem = questItems.find((qi) => qi.id === selectedQuestItemId);

	// ════════════════════════════════════════════════════════════════════════════
	// SCREEN: SETUP
	// ════════════════════════════════════════════════════════════════════════════
	const screenSetup = (
		<div className="flex flex-col min-h-full">
			<div className="px-5 pt-10 pb-5">
				<div
					style={{
						...PX,
						fontSize: "7px",
						color: "#6060a0",
						marginBottom: "10px",
						letterSpacing: "2px"
					}}
				>
					▶ DAILY QUEST
				</div>
				<h1
					style={{
						...PX,
						fontSize: "14px",
						lineHeight: 1.8,
						color: "#00ff9f",
						textShadow: "0 0 20px rgba(0,255,159,0.4)"
					}}
				>
					WHAT ARE
					<br />
					YOU HUNTING?
				</h1>
				<p style={{ ...RJ, fontSize: "15px", color: "#6060a0", marginTop: "8px" }}>
					Add items to your quest — we'll build the route.
				</p>
			</div>

			<div className="flex-1 px-4 space-y-3 pb-4">
				<AnimatePresence>
					{questItems.map((qi, i) => (
						<motion.div
							key={qi.id}
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -50, height: 0, marginBottom: 0 }}
							transition={{ delay: i * 0.05 }}
						>
							<PxBox color={CAT[qi.category].color} className="p-3 flex items-center gap-3">
								<span style={{ fontSize: "26px" }}>{CAT[qi.category].emoji}</span>
								<div className="flex-1 min-w-0">
									<div style={{ ...VT, fontSize: "21px", color: "#e0e0ff", lineHeight: 1 }}>
										{qi.name.toUpperCase()}
									</div>
									{qi.desc && (
										<div style={{ ...RJ, fontSize: "13px", color: "#6060a0" }}>{qi.desc}</div>
									)}
									<div className="flex gap-2 mt-1 flex-wrap">
										<CatBadge cat={qi.category} />
										<span style={{ ...VT, fontSize: "13px", color: "#6060a0" }}>
											MAX ¥{qi.budget}
										</span>
									</div>
								</div>
								<button
									onClick={() => setQuestItems((p) => p.filter((x) => x.id !== qi.id))}
									className="p-1 shrink-0"
									style={{ color: "#6060a0" }}
								>
									<X size={15} />
								</button>
							</PxBox>
						</motion.div>
					))}
				</AnimatePresence>

				{questItems.length === 0 && (
					<div className="text-center py-10">
						{/* Chalice sprite — 32×32 @ scale 5 = 160px */}
						<div className="flex justify-center">
							<motion.div
								animate={{ y: [0, -8, 0] }}
								transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
								style={{ filter: "drop-shadow(0 0 18px rgba(255,200,0,0.5))" }}
							>
								<PixelSprite frames={[CHALICE_FRAME]} scale={5} />
							</motion.div>
						</div>
						<div
							style={{
								...VT,
								fontSize: "17px",
								color: "#6060a0",
								marginTop: "12px",
								lineHeight: 1.5
							}}
						>
							NO TARGETS ADDED
							<br />
							TAP BELOW TO START
						</div>
					</div>
				)}
			</div>

			<div className="px-4 pb-10 space-y-3 pt-2">
				<button
					onClick={() => goForward("add-item")}
					className="w-full py-3 flex items-center justify-center gap-2"
					style={{
						border: "1px dashed rgba(0,255,159,0.35)",
						...PX,
						fontSize: "9px",
						color: "#00ff9f"
					}}
				>
					<Plus size={14} /> ADD TARGET
				</button>
				<button
					onClick={handleStartQuest}
					disabled={!questItems.length}
					className="w-full py-4 bg-primary text-primary-foreground disabled:opacity-25"
					style={{
						...PX,
						fontSize: "11px",
						boxShadow: questItems.length ? "0 0 28px rgba(0,255,159,0.4), 0 4px 0 #007a50" : "none"
					}}
				>
					▶ START QUEST{questItems.length > 0 ? ` (${questItems.length})` : ""}
				</button>
			</div>
		</div>
	);

	// ════════════════════════════════════════════════════════════════════════════
	// SCREEN: ADD ITEM
	// ════════════════════════════════════════════════════════════════════════════
	const screenAddItem = (
		<div className="flex flex-col min-h-full">
			<div className="px-5 pt-10 pb-5">
				<button
					onClick={handleBack}
					style={{
						...VT,
						fontSize: "16px",
						color: "#6060a0",
						display: "flex",
						alignItems: "center",
						gap: "4px",
						marginBottom: "16px"
					}}
				>
					<ChevronLeft size={16} /> BACK
				</button>
				<div style={{ ...PX, fontSize: "7px", color: "#6060a0", marginBottom: "8px" }}>
					▶ NEW TARGET
				</div>
				<h1 style={{ ...PX, fontSize: "13px", lineHeight: 1.8, color: "#00ff9f" }}>
					ADD ITEM
					<br />
					TO QUEST
				</h1>
			</div>
			<div className="flex-1 px-4 space-y-5 pb-4 overflow-y-auto">
				<div>
					<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "6px" }}>
						ITEM NAME
					</div>
					<input
						type="text"
						placeholder="Nikon F3, Gundam RX-78..."
						value={itemDraft.name}
						onChange={(e) => setItemDraft((p) => ({ ...p, name: e.target.value }))}
						onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
						autoFocus
						className="w-full px-3 py-3 bg-secondary text-foreground outline-none placeholder-muted-foreground"
						style={{
							...VT,
							fontSize: "20px",
							border: "1px solid rgba(0,255,159,0.25)",
							color: "#e0e0ff"
						}}
					/>
				</div>
				<div>
					<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "6px" }}>
						DESCRIPTION (optional)
					</div>
					<input
						type="text"
						placeholder="Any details..."
						value={itemDraft.desc}
						onChange={(e) => setItemDraft((p) => ({ ...p, desc: e.target.value }))}
						className="w-full px-3 py-2 bg-secondary text-foreground outline-none placeholder-muted-foreground"
						style={{ ...RJ, fontSize: "15px", border: "1px solid rgba(0,255,159,0.12)" }}
					/>
				</div>
				<div>
					<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "8px" }}>
						CATEGORY
					</div>
					<div className="grid grid-cols-2 gap-2">
						{(Object.keys(CAT) as Category[]).map((cat) => (
							<button
								key={cat}
								onClick={() => setItemDraft((p) => ({ ...p, category: cat }))}
								className="flex items-center gap-2 px-3 py-3 transition-all"
								style={{
									border: `1px solid ${itemDraft.category === cat ? CAT[cat].color : "rgba(0,255,159,0.1)"}`,
									background: itemDraft.category === cat ? CAT[cat].bg : "transparent",
									color: itemDraft.category === cat ? CAT[cat].color : "#6060a0"
								}}
							>
								<span style={{ fontSize: "20px" }}>{CAT[cat].emoji}</span>
								<span style={{ ...VT, fontSize: "15px" }}>{CAT[cat].label}</span>
							</button>
						))}
					</div>
				</div>
				<div>
					<div className="flex justify-between mb-2">
						<span style={{ ...VT, fontSize: "13px", color: "#6060a0" }}>MAX BUDGET</span>
						<span style={{ ...VT, fontSize: "20px", color: "#00ff9f" }}>¥{itemDraft.budget}</span>
					</div>
					<input
						type="range"
						min={10}
						max={500}
						step={10}
						value={itemDraft.budget}
						onChange={(e) => setItemDraft((p) => ({ ...p, budget: parseInt(e.target.value) }))}
						className="w-full"
						style={{ accentColor: "#00ff9f" }}
					/>
				</div>
			</div>
			<div className="px-4 pb-10 pt-2 space-y-3">
				<button
					onClick={handleBack}
					className="w-full py-3"
					style={{
						...VT,
						fontSize: "18px",
						border: "1px solid rgba(0,255,159,0.15)",
						color: "#6060a0"
					}}
				>
					CANCEL
				</button>
				<button
					onClick={handleAddItem}
					disabled={!itemDraft.name.trim()}
					className="w-full py-4 bg-primary text-primary-foreground disabled:opacity-30"
					style={{
						...PX,
						fontSize: "9px",
						boxShadow: itemDraft.name.trim()
							? "0 0 22px rgba(0,255,159,0.4), 0 3px 0 #007a50"
							: "none"
					}}
				>
					ADD TO QUEST ▶
				</button>
			</div>
		</div>
	);

	// ════════════════════════════════════════════════════════════════════════════
	// SCREEN: QUEST
	// ════════════════════════════════════════════════════════════════════════════
	const screenQuest = (
		<div
			className="flex flex-col min-h-full"
			{...carouselSwipe(
				() => setShopIdx((i) => Math.min(i + 1, shops.length - 1)),
				() => setShopIdx((i) => Math.max(i - 1, 0))
			)}
		>
			<div className="px-4 pt-6 pb-3">
				<div className="flex items-center justify-between mb-3">
					<button
						onClick={handleBack}
						style={{
							...VT,
							fontSize: "16px",
							color: "#6060a0",
							display: "flex",
							alignItems: "center",
							gap: "4px"
						}}
					>
						<ChevronLeft size={16} /> SETUP
					</button>
					<div style={{ ...VT, fontSize: "15px", color: "#6060a0" }}>
						{shops.filter((s) => s.visited).length}/{shops.length} VISITED
					</div>
				</div>
				<XPBar xp={xp} maxXp={maxXP} level={level} />
				<div className="mt-3">
					<div className="flex justify-between mb-1">
						<span style={{ ...VT, fontSize: "13px", color: "#6060a0" }}>QUEST PROGRESS</span>
						<span style={{ ...VT, fontSize: "13px", color: "#ff9500" }}>
							{Math.round(questProgress * 100)}%
						</span>
					</div>
					<div
						style={{
							height: "6px",
							background: "#151530",
							border: "1px solid rgba(255,149,0,0.2)",
							position: "relative",
							overflow: "hidden"
						}}
					>
						<motion.div
							className="absolute inset-y-0 left-0"
							animate={{ width: `${questProgress * 100}%` }}
							style={{ background: "#ff9500", boxShadow: "0 0 6px #ff9500" }}
						/>
					</div>
				</div>
			</div>
			<div className="px-4 mb-3">
				<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "5px" }}>
					HUNTING FOR:
				</div>
				<div className="flex gap-2 flex-wrap">
					{questItems.map((qi) => (
						<span
							key={qi.id}
							style={{
								...VT,
								fontSize: "13px",
								color: CAT[qi.category].color,
								background: CAT[qi.category].bg,
								padding: "2px 7px",
								border: `1px solid ${CAT[qi.category].color}33`
							}}
						>
							{CAT[qi.category].emoji} {qi.name.toUpperCase()}
						</span>
					))}
				</div>
			</div>
			<div className="px-4 flex-1">
				<AnimatePresence mode="wait">
					{currentShop && (
						<motion.div
							key={currentShop.id}
							initial={{ opacity: 0, x: 40 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -40 }}
							transition={{ duration: 0.18 }}
						>
							<PxBox color={currentShop.visited ? "#00b4d8" : "#00ff9f"} className="p-5">
								<div className="flex items-center justify-between mb-3">
									<div style={{ ...PX, fontSize: "7px", color: "#6060a0" }}>
										STOP {shopIdx + 1}/{shops.length}
									</div>
									<div className="flex gap-2">
										{currentShop.visited && (
											<span
												style={{
													...VT,
													fontSize: "13px",
													color: "#00b4d8",
													background: "rgba(0,180,216,0.15)",
													padding: "1px 6px"
												}}
											>
												✓ DONE
											</span>
										)}
										{currentShop.findsCount > 0 && (
											<span
												style={{
													...VT,
													fontSize: "13px",
													color: "#ffc800",
													background: "rgba(255,200,0,0.15)",
													padding: "1px 6px"
												}}
											>
												🎯 {currentShop.findsCount}
											</span>
										)}
									</div>
								</div>
								<h2 style={{ ...PX, fontSize: "11px", color: "#e0e0ff", lineHeight: 1.7 }}>
									{currentShop.name}
								</h2>
								<div className="flex items-center gap-2 mt-2">
									<MapPin size={13} color="#6060a0" />
									<span style={{ ...VT, fontSize: "16px", color: "#6060a0" }}>
										{currentShop.district}
									</span>
									<span style={{ ...VT, fontSize: "15px", color: "#00ff9f", marginLeft: "auto" }}>
										📍 {currentShop.distance}
									</span>
								</div>
								<div style={{ ...VT, fontSize: "15px", color: "#6060a0", marginTop: "3px" }}>
									{currentShop.type}
								</div>
								<div className="flex gap-2 mt-3 flex-wrap">
									{currentShop.categories.map((c) => (
										<CatBadge key={c} cat={c} />
									))}
								</div>
								<div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(0,255,159,0.1)" }}>
									{questItems
										.filter((qi) => currentShop.categories.includes(qi.category))
										.map((qi) => (
											<div key={qi.id} className="flex items-center gap-2 mb-1">
												<span>{CAT[qi.category].emoji}</span>
												<span style={{ ...VT, fontSize: "16px", color: CAT[qi.category].color }}>
													{qi.name.toUpperCase()}
												</span>
												<span
													style={{ ...VT, fontSize: "14px", color: "#6060a0", marginLeft: "auto" }}
												>
													¥{qi.budget}
												</span>
											</div>
										))}
								</div>
							</PxBox>
						</motion.div>
					)}
				</AnimatePresence>
				<div className="flex justify-center gap-2 mt-4">
					{shops.map((s, i) => (
						<button
							key={s.id}
							onClick={() => setShopIdx(i)}
							style={{
								height: "8px",
								width: i === shopIdx ? "20px" : "8px",
								background: s.visited ? "#00b4d8" : i === shopIdx ? "#00ff9f" : "#1a1a35",
								border: "1px solid rgba(0,255,159,0.2)",
								transition: "all 0.2s"
							}}
						/>
					))}
				</div>
				<div className="flex justify-center gap-4 mt-3">
					<ChevronLeft size={14} color="#6060a0" />
					<span style={{ ...VT, fontSize: "13px", color: "#6060a0" }}>SWIPE TO BROWSE</span>
					<ChevronRight size={14} color="#6060a0" />
				</div>
			</div>
			<div className="px-4 pb-10 pt-4 space-y-3">
				<button
					onClick={handleEnterShop}
					className="w-full py-4 bg-primary text-primary-foreground"
					style={{
						...PX,
						fontSize: "9px",
						boxShadow: "0 0 22px rgba(0,255,159,0.4), 0 3px 0 #007a50"
					}}
				>
					🚪 ENTER SHOP
				</button>
				<button
					onClick={() => {
						setReviewIdx(0);
						goForward("review");
					}}
					className="w-full py-3"
					style={{
						...VT,
						fontSize: "17px",
						color: "#6060a0",
						border: "1px solid rgba(0,255,159,0.15)"
					}}
				>
					{finds.length > 0
						? `⚡ END QUEST · ${finds.length} FIND${finds.length > 1 ? "S" : ""}`
						: "END QUEST"}
				</button>
			</div>
		</div>
	);

	// ════════════════════════════════════════════════════════════════════════════
	// SCREEN: SHOP — State #1 "Scanning"
	// ════════════════════════════════════════════════════════════════════════════
	const screenShop = (
		<div style={{ display: "flex", flexDirection: "column", minHeight: "100svh" }}>
			{/* ── HEADER ── */}
			<div className="px-4 pt-5 pb-3" style={{ flexShrink: 0 }}>
				<XPBar xp={xp} maxXp={maxXP} level={level} />
				<div className="flex items-center justify-between mt-4">
					<div style={{ flex: 1 }}>
						<div style={{ ...PX, fontSize: "8px", color: "#00ff9f", lineHeight: 1.8 }}>
							{activeShop?.name}
						</div>
						<div style={{ ...VT, fontSize: "14px", color: "#6060a0" }}>
							{activeShop?.district} · {activeShop?.distance}
						</div>
					</div>
					<button
						onClick={handleShopPhoto}
						style={{
							color: activeShop?.hasPhoto ? "#00b4d8" : "#3a3a6a",
							padding: "4px",
							textAlign: "center",
							flexShrink: 0
						}}
					>
						<Camera size={20} />
						{activeShop?.hasPhoto && (
							<div style={{ ...VT, fontSize: "10px", color: "#00b4d8", lineHeight: 1 }}>+25</div>
						)}
					</button>
				</div>
				{shopFinds.length > 0 && (
					<div className="flex gap-2 flex-wrap mt-3">
						{shopFinds.map((f) => (
							<span
								key={f.id}
								style={{
									...VT,
									fontSize: "13px",
									color: CAT[f.category].color,
									background: CAT[f.category].bg,
									padding: "2px 8px",
									border: `1px solid ${CAT[f.category].color}44`
								}}
							>
								🎯 {f.itemName.toUpperCase()} · ¥{f.price}
							</span>
						))}
					</div>
				)}
			</div>

			{/* ── BODY — character vertically centered ── */}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center"
				}}
			>
				<div
					style={{
						position: "relative",
						display: "inline-flex",
						flexDirection: "column",
						alignItems: "center"
					}}
				>
					<QuestionMarks />
					<div style={{ marginTop: "62px" }}>
						<motion.div
							animate={{ y: [0, -6, 0] }}
							transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
						>
							<PixelSprite frames={CHAR_FRAMES} fps={3} scale={5} />
						</motion.div>
					</div>
				</div>
				<motion.div
					animate={{ opacity: [0.4, 1, 0.4] }}
					transition={{ repeat: Infinity, duration: 2.8 }}
					style={{
						...VT,
						fontSize: "18px",
						color: "#6060a0",
						marginTop: "20px",
						letterSpacing: "2px"
					}}
				>
					SCANNING THE SHOP...
				</motion.div>
			</div>

			{/* ── FOOTER — balanced EXIT / SPOTTED! ── */}
			<div className="px-4 pb-10 pt-3 flex gap-3" style={{ flexShrink: 0 }}>
				{/* EXIT — red, danger color, running-to-door icon (LogOut flipped left) */}
				<motion.button
					onClick={handleExitShop}
					style={{
						flex: 1,
						background: "linear-gradient(135deg,#cc0022,#880011)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "7px",
						padding: "18px 10px",
						...PX,
						fontSize: "9px",
						color: "white",
						boxShadow: "0 0 18px rgba(200,0,30,0.4), 0 3px 0 #550008"
					}}
					whileTap={{ scale: 0.97 }}
				>
					{/* LogOut flipped = arrow pointing left = exit toward door on the left */}
					<LogOut size={15} style={{ transform: "scaleX(-1)" }} />
					EXIT
				</motion.button>

				{/* SPOTTED! — gold, Search/magnifying-glass icon */}
				<motion.button
					onClick={() => goForward("item-select")}
					style={{
						flex: 1,
						background: "linear-gradient(135deg,#ffc800,#ff9500)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "7px",
						padding: "18px 10px",
						...PX,
						fontSize: "9px",
						color: "#0a0a18",
						boxShadow: "0 0 28px rgba(255,200,0,0.55), 0 4px 0 #cc7700"
					}}
					whileTap={{ scale: 0.97 }}
				>
					<Search size={15} />
					<motion.span
						animate={{ opacity: [1, 0.72, 1] }}
						transition={{ repeat: Infinity, duration: 1.8 }}
					>
						SPOTTED!
					</motion.span>
				</motion.button>
			</div>
		</div>
	);

	// ════════════════════════════════════════════════════════════════════════════
	// SCREEN: ITEM SELECT — State #2 "Which item?"
	// ════════════════════════════════════════════════════════════════════════════
	const screenItemSelect = (
		<div className="flex flex-col min-h-full">
			<div className="px-5 pt-10 pb-5">
				<button
					onClick={handleBack}
					style={{
						...VT,
						fontSize: "16px",
						color: "#6060a0",
						display: "flex",
						alignItems: "center",
						gap: "4px",
						marginBottom: "16px"
					}}
				>
					<ChevronLeft size={16} /> BACK
				</button>
				<div style={{ ...PX, fontSize: "7px", color: "#ffc800", marginBottom: "8px" }}>
					▶ STEP 2 / 3
				</div>
				<h1
					style={{
						...PX,
						fontSize: "12px",
						lineHeight: 2,
						color: "#ffc800",
						textShadow: "0 0 16px rgba(255,200,0,0.5)"
					}}
				>
					WHAT DID
					<br />
					YOU SPOT?
				</h1>
				<div style={{ ...VT, fontSize: "15px", color: "#6060a0", marginTop: "4px" }}>
					in {activeShop?.name}
				</div>
			</div>

			<div className="flex-1 px-4 space-y-3 pb-4">
				<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "4px" }}>
					CHOOSE FROM YOUR QUEST:
				</div>
				{questItems.map((qi, i) => (
					<motion.button
						key={qi.id}
						onClick={() => handleItemSelect(qi.id)}
						className="w-full flex items-center gap-4 px-4 py-4 text-left"
						style={{
							border: `1px solid ${CAT[qi.category].color}55`,
							background: CAT[qi.category].bg
						}}
						initial={{ opacity: 0, x: 60 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: i * 0.07 }}
						whileTap={{ scale: 0.98 }}
					>
						<span style={{ fontSize: "36px", lineHeight: 1 }}>{CAT[qi.category].emoji}</span>
						<div className="flex-1">
							<div
								style={{ ...PX, fontSize: "10px", color: CAT[qi.category].color, lineHeight: 1.8 }}
							>
								{qi.name.toUpperCase()}
							</div>
							<div style={{ ...VT, fontSize: "15px", color: "#6060a0" }}>
								{CAT[qi.category].label} · MAX ¥{qi.budget}
							</div>
							{qi.desc && (
								<div style={{ ...RJ, fontSize: "13px", color: "#6060a0" }}>{qi.desc}</div>
							)}
						</div>
						<ChevronRight size={20} color={CAT[qi.category].color} />
					</motion.button>
				))}
			</div>

			<div className="px-4 pb-10 pt-2">
				<div style={{ ...VT, fontSize: "14px", color: "#3a3a6a", textAlign: "center" }}>
					← SWIPE RIGHT OR TAP BACK TO CANCEL
				</div>
			</div>
		</div>
	);

	// ════════════════════════════════════════════════════════════════════════════
	// SCREEN: FOUND LOG — State #3 "Log the find"
	// ════════════════════════════════════════════════════════════════════════════
	const screenFoundLog = (
		<div className="flex flex-col min-h-full">
			<div className="px-5 pt-10 pb-4">
				<button
					onClick={handleBack}
					style={{
						...VT,
						fontSize: "16px",
						color: "#6060a0",
						display: "flex",
						alignItems: "center",
						gap: "4px",
						marginBottom: "16px"
					}}
				>
					<ChevronLeft size={16} /> CANCEL
				</button>
				<div style={{ ...PX, fontSize: "7px", color: "#ff9500", marginBottom: "8px" }}>
					▶ STEP 3 / 3
				</div>
				<h1
					style={{
						...PX,
						fontSize: "11px",
						lineHeight: 2,
						color: "#ff9500",
						textShadow: "0 0 15px rgba(255,149,0,0.4)"
					}}
				>
					WHAT DID
					<br />
					YOU FIND?
				</h1>
				{selectedItem && (
					<div
						className="flex items-center gap-3 mt-4 px-3 py-2"
						style={{
							background: CAT[selectedItem.category].bg,
							border: `1px solid ${CAT[selectedItem.category].color}55`
						}}
					>
						<span style={{ fontSize: "26px" }}>{CAT[selectedItem.category].emoji}</span>
						<div>
							<div style={{ ...PX, fontSize: "9px", color: CAT[selectedItem.category].color }}>
								{selectedItem.name.toUpperCase()}
							</div>
							<div style={{ ...VT, fontSize: "14px", color: "#6060a0" }}>
								{activeShop?.name} · MAX ¥{selectedItem.budget}
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="flex-1 px-4 space-y-5 pb-4 overflow-y-auto">
				<div>
					<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "6px" }}>
						PRICE (¥)
					</div>
					<input
						type="number"
						placeholder="0"
						value={findDraft.price}
						onChange={(e) => setFindDraft((p) => ({ ...p, price: e.target.value }))}
						className="w-full px-3 py-3 bg-secondary text-foreground outline-none"
						style={{
							...PX,
							fontSize: "22px",
							border: "1px solid rgba(0,255,159,0.2)",
							color: "#00ff9f"
						}}
					/>
				</div>
				<div>
					<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "8px" }}>
						CONDITION
					</div>
					<div className="grid grid-cols-2 gap-2">
						{(Object.keys(COND) as Condition[]).map((c) => (
							<button
								key={c}
								onClick={() => setFindDraft((p) => ({ ...p, condition: c }))}
								className="px-3 py-3"
								style={{
									border: `1px solid ${findDraft.condition === c ? COND[c].color : "rgba(0,255,159,0.1)"}`,
									background: findDraft.condition === c ? `${COND[c].color}18` : "transparent"
								}}
							>
								<div
									style={{
										...VT,
										fontSize: "18px",
										color: findDraft.condition === c ? COND[c].color : "#6060a0"
									}}
								>
									{c}
								</div>
								<div style={{ ...VT, fontSize: "15px", color: COND[c].color }}>{COND[c].stars}</div>
							</button>
						))}
					</div>
				</div>
				<div>
					<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "6px" }}>
						NOTES (optional)
					</div>
					<textarea
						placeholder="Serial number, scratches, seller tag..."
						rows={2}
						value={findDraft.notes}
						onChange={(e) => setFindDraft((p) => ({ ...p, notes: e.target.value }))}
						className="w-full px-3 py-2 bg-secondary text-foreground outline-none resize-none placeholder-muted-foreground"
						style={{ ...RJ, fontSize: "15px", border: "1px solid rgba(0,255,159,0.1)" }}
					/>
				</div>
				<button
					onClick={() => setFindDraft((p) => ({ ...p, hasPhoto: !p.hasPhoto }))}
					className="w-full py-3 flex items-center justify-center gap-2"
					style={{
						border: `1px solid ${findDraft.hasPhoto ? "#00b4d8" : "rgba(0,255,159,0.15)"}`,
						background: findDraft.hasPhoto ? "rgba(0,180,216,0.1)" : "transparent",
						color: findDraft.hasPhoto ? "#00b4d8" : "#6060a0"
					}}
				>
					<Camera size={18} />
					<span style={{ ...VT, fontSize: "17px" }}>
						{findDraft.hasPhoto ? "📸 PHOTO TAKEN" : "TAKE PHOTO"}
					</span>
				</button>
			</div>

			<div className="px-4 pb-10 pt-2">
				<motion.button
					onClick={handleSaveFind}
					disabled={!findDraft.price}
					className="w-full py-5 disabled:opacity-30"
					style={{
						background: "linear-gradient(135deg,#ff9500,#ffc800)",
						...PX,
						fontSize: "9px",
						color: "#0a0a18",
						boxShadow: findDraft.price ? "0 0 30px rgba(255,149,0,0.5), 0 4px 0 #cc6600" : "none"
					}}
					whileTap={{ scale: 0.97 }}
				>
					⭐ GET QUEST REWARD! +500 XP
				</motion.button>
			</div>
		</div>
	);

	// ════════════════════════════════════════════════════════════════════════════
	// SCREEN: REVIEW
	// ════════════════════════════════════════════════════════════════════════════
	const screenReview = (
		<div
			className="flex flex-col min-h-full"
			{...carouselSwipe(
				() => setReviewIdx((i) => Math.min(i + 1, questItems.length - 1)),
				() => setReviewIdx((i) => Math.max(i - 1, 0))
			)}
		>
			<div className="px-4 pt-6 pb-4">
				<div className="flex items-center gap-3 mb-4">
					<button
						onClick={handleBack}
						style={{
							...VT,
							fontSize: "16px",
							color: "#6060a0",
							display: "flex",
							alignItems: "center",
							gap: "4px"
						}}
					>
						<ChevronLeft size={16} /> ROUTE
					</button>
					<div style={{ ...PX, fontSize: "8px", color: "#ffc800", flex: 1, textAlign: "center" }}>
						QUEST REVIEW
					</div>
				</div>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: "spring", stiffness: 280, damping: 20 }}
					className="text-center mb-4"
				>
					<div style={{ fontSize: "52px" }}>
						{finds.length === 0 ? "😅" : finds.length < 3 ? "🥉" : finds.length < 6 ? "🥈" : "🏆"}
					</div>
					<div
						style={{
							...PX,
							fontSize: "11px",
							color: "#00ff9f",
							marginTop: "8px",
							textShadow: "0 0 15px rgba(0,255,159,0.4)"
						}}
					>
						{finds.length === 0
							? "NO FINDS TODAY"
							: `${finds.length} DEAL${finds.length > 1 ? "S" : ""} FOUND`}
					</div>
				</motion.div>
				<div className="grid grid-cols-3 gap-2 mb-4">
					{[
						{ l: "XP EARNED", v: `${xp}`, e: "⚡" },
						{ l: "SHOPS", v: `${shops.filter((s) => s.visited).length}/${shops.length}`, e: "🏪" },
						{ l: "LEVEL", v: `${level}`, e: "🎮" }
					].map((s) => (
						<PxBox key={s.l} color="#00ff9f" className="p-3 text-center">
							<div style={{ fontSize: "18px" }}>{s.e}</div>
							<div style={{ ...PX, fontSize: "10px", color: "#00ff9f", marginTop: "3px" }}>
								{s.v}
							</div>
							<div style={{ ...VT, fontSize: "12px", color: "#6060a0" }}>{s.l}</div>
						</PxBox>
					))}
				</div>
				<XPBar xp={xp} maxXp={maxXP} level={level} />
			</div>

			{questItems.length > 0 && (
				<div className="px-4 flex-1">
					<div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
						{questItems.map((qi, i) => {
							const cnt = finds.filter((f) => f.questItemId === qi.id).length;
							return (
								<button
									key={qi.id}
									onClick={() => setReviewIdx(i)}
									className="shrink-0 px-3 py-1"
									style={{
										border: `1px solid ${i === reviewIdx ? CAT[qi.category].color : "rgba(0,255,159,0.12)"}`,
										background: i === reviewIdx ? CAT[qi.category].bg : "transparent",
										color: i === reviewIdx ? CAT[qi.category].color : "#6060a0"
									}}
								>
									<span style={{ ...VT, fontSize: "14px" }}>
										{CAT[qi.category].emoji} {qi.name.toUpperCase()}
									</span>
									{cnt > 0 && (
										<span style={{ ...VT, fontSize: "13px", marginLeft: "5px", color: "#ffc800" }}>
											[{cnt}]
										</span>
									)}
								</button>
							);
						})}
					</div>
					<AnimatePresence mode="wait">
						{questItems[reviewIdx] &&
							(() => {
								const qi = questItems[reviewIdx];
								const itemFinds = finds
									.filter((f) => f.questItemId === qi.id)
									.sort((a, b) => a.price - b.price);
								const best = itemFinds[0];
								return (
									<motion.div
										key={qi.id}
										initial={{ opacity: 0, x: 30 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -30 }}
										transition={{ duration: 0.18 }}
									>
										{itemFinds.length === 0 ? (
											<div className="text-center py-10">
												<div style={{ fontSize: "36px" }}>😶</div>
												<div
													style={{ ...VT, fontSize: "17px", color: "#6060a0", marginTop: "8px" }}
												>
													NO FINDS FOR THIS TARGET
												</div>
											</div>
										) : (
											<div className="space-y-3">
												{itemFinds.map((f, fi) => {
													const isBest = f.id === best?.id;
													return (
														<motion.div
															key={f.id}
															initial={{ opacity: 0, y: 18 }}
															animate={{ opacity: 1, y: 0 }}
															transition={{ delay: fi * 0.07 }}
														>
															<PxBox
																color={isBest ? "#ffc800" : "#00ff9f"}
																className="p-4 relative"
															>
																{isBest && (
																	<div
																		className="absolute -top-px -right-px px-2 py-1"
																		style={{
																			background: "#ffc800",
																			...PX,
																			fontSize: "6px",
																			color: "#0a0a18"
																		}}
																	>
																		BEST DEAL
																	</div>
																)}
																<div className="flex items-start justify-between">
																	<div>
																		<div style={{ ...VT, fontSize: "16px", color: "#6060a0" }}>
																			{f.shopName}
																		</div>
																		<div
																			style={{
																				...VT,
																				fontSize: "15px",
																				color: COND[f.condition].color
																			}}
																		>
																			{f.condition} {COND[f.condition].stars}
																		</div>
																		{f.notes && (
																			<div
																				style={{
																					...RJ,
																					fontSize: "13px",
																					color: "#6060a0",
																					marginTop: "3px"
																				}}
																			>
																				{f.notes}
																			</div>
																		)}
																		<div className="flex gap-3 mt-2">
																			{f.hasPhoto && (
																				<span style={{ ...VT, fontSize: "13px", color: "#00b4d8" }}>
																					📸
																				</span>
																			)}
																			<span style={{ ...VT, fontSize: "13px", color: "#6060a0" }}>
																				{f.timestamp}
																			</span>
																		</div>
																	</div>
																	<div
																		style={{
																			...PX,
																			fontSize: "16px",
																			color: isBest ? "#ffc800" : "#00ff9f",
																			textShadow: `0 0 8px ${isBest ? "#ffc800" : "#00ff9f"}`
																		}}
																	>
																		¥{f.price}
																	</div>
																</div>
																{f.price > qi.budget && (
																	<div
																		style={{
																			...VT,
																			fontSize: "13px",
																			color: "#ff006e",
																			marginTop: "5px"
																		}}
																	>
																		⚠ OVER BUDGET (max ¥{qi.budget})
																	</div>
																)}
															</PxBox>
														</motion.div>
													);
												})}
											</div>
										)}
									</motion.div>
								);
							})()}
					</AnimatePresence>
				</div>
			)}

			<div className="px-4 pb-10 pt-6">
				<button
					onClick={handleNewQuest}
					className="w-full py-4"
					style={{
						...PX,
						fontSize: "9px",
						color: "#00ff9f",
						border: "1px solid rgba(0,255,159,0.3)",
						boxShadow: "0 0 12px rgba(0,255,159,0.1)"
					}}
				>
					▶ NEW QUEST
				</button>
			</div>
		</div>
	);

	// ── Screen map ────────────────────────────────────────────────────────────────
	const SCREENS: Record<ScreenId, React.ReactNode> = {
		setup: screenSetup,
		"add-item": screenAddItem,
		quest: screenQuest,
		shop: screenShop,
		"item-select": screenItemSelect,
		"found-log": screenFoundLog,
		review: screenReview
	};

	// ── Polaroid FOUND overlay ────────────────────────────────────────────────────
	const foundOverlay = (
		<AnimatePresence>
			{foundAnim && (
				<motion.div
					className="fixed inset-0 flex flex-col items-center justify-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					style={{ zIndex: 800, background: "rgba(10,10,24,0.97)" }}
				>
					{/* Sparkle particles */}
					{Array.from({ length: 8 }).map((_, i) => {
						const a = (i / 8) * Math.PI * 2;
						return (
							<motion.div
								key={i}
								className="absolute"
								style={{ left: "50%", top: "42%", fontSize: "18px" }}
								initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
								animate={{ x: Math.cos(a) * 110, y: Math.sin(a) * 110, opacity: 0, scale: 0.4 }}
								transition={{ duration: 1.1, delay: 0.5 + i * 0.04, ease: "easeOut" }}
							>
								{["✨", "⭐", "💫", "✦"][i % 4]}
							</motion.div>
						);
					})}

					{/* Polaroid rising with hand */}
					<motion.div
						initial={{ y: 180, rotate: -18 }}
						animate={{ y: 0, rotate: [-18, 6, -4, 2, 0] }}
						transition={{ duration: 0.65, ease: "easeOut", times: [0, 0.5, 0.7, 0.85, 1] }}
						style={{ filter: "drop-shadow(0 8px 24px rgba(255,200,0,0.4))" }}
					>
						<motion.div
							animate={{ rotate: [-2, 2, -1.5, 1, -2] }}
							transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
						>
							<PixelSprite frames={[POLAROID_FRAME]} scale={7} />
						</motion.div>
					</motion.div>

					{/* Item name label (appears below Polaroid) */}
					<motion.div
						className="text-center mt-4 px-8"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6 }}
					>
						<div style={{ ...VT, fontSize: "13px", color: "#6060a0", marginBottom: "4px" }}>
							ITEM LOGGED
						</div>
						<div style={{ ...PX, fontSize: "12px", color: "#e0e0ff", lineHeight: 1.8 }}>
							{foundLabel.toUpperCase()}
						</div>
					</motion.div>

					{/* XP badge */}
					<motion.div
						initial={{ opacity: 0, scale: 0, y: 10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						transition={{ delay: 0.9, type: "spring", stiffness: 320, damping: 16 }}
						className="mt-5 flex items-center gap-2 px-5 py-3"
						style={{
							background: "linear-gradient(135deg,#ff9500,#ffc800)",
							boxShadow: "0 0 28px rgba(255,180,0,0.55)"
						}}
					>
						<Zap size={16} color="#0a0a18" />
						<span style={{ ...PX, fontSize: "10px", color: "#0a0a18" }}>+500 XP</span>
						<Zap size={16} color="#0a0a18" />
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);

	// ════════════════════════════════════════════════════════════════════════════
	// ROOT RENDER
	// ════════════════════════════════════════════════════════════════════════════
	return (
		<div
			className="bg-background text-foreground"
			style={{
				minHeight: "100svh",
				maxWidth: "430px",
				margin: "0 auto",
				position: "relative",
				overflow: "hidden",
				...RJ
			}}
			onTouchStart={onTouchStart}
			onTouchEnd={onTouchEnd}
		>
			{/* CRT scanlines */}
			<div
				className="fixed inset-0 pointer-events-none"
				style={{
					zIndex: 1000,
					background:
						"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.02) 3px,rgba(0,0,0,0.02) 4px)"
				}}
			/>

			{/* Special FX overlays */}
			{fx?.type === "shatter" && <GlassShatter onComplete={onShatterDone} />}
			{fx?.type === "glitch" && <GlitchEffect onComplete={onGlitchDone} />}

			{foundOverlay}

			{/* ── Slide transition: 200%-wide track ── */}
			<div style={{ position: "relative", overflow: "hidden", minHeight: "100svh" }}>
				{fx ? (
					// During special effects: static render
					<div style={{ minHeight: "100svh", overflowY: "auto" }}>{SCREENS[screen]}</div>
				) : prevScreen && navAnim !== "instant" ? (
					// Active transition: side-by-side slider
					<motion.div
						key={`${prevScreen}→${screen}`}
						style={{ display: "flex", width: "200%", willChange: "transform" }}
						initial={{ x: navAnim === "backward" ? "-50%" : "0%" }}
						animate={{ x: navAnim === "backward" ? "0%" : "-50%" }}
						transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
					>
						{navAnim === "forward" ? (
							<>
								<ScreenSlot>{SCREENS[prevScreen]}</ScreenSlot>
								<ScreenSlot>{SCREENS[screen]}</ScreenSlot>
							</>
						) : (
							<>
								<ScreenSlot>{SCREENS[screen]}</ScreenSlot>
								<ScreenSlot>{SCREENS[prevScreen]}</ScreenSlot>
							</>
						)}
					</motion.div>
				) : (
					// Idle: just show current screen
					<div style={{ minHeight: "100svh", overflowY: "auto" }}>{SCREENS[screen]}</div>
				)}
			</div>
		</div>
	);
}
