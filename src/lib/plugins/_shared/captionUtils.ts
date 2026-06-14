import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { DEFAULT_SETTINGS, type DocxPluginSettings } from "@/core/settings";

const HEADING_EXCLUSIONS = [
	"введение",
	"заключение",
	"список использованных источников",
	"содержание",
];

export type EditorDisplaySettings = Pick<
	DocxPluginSettings,
	| "captionSeparator"
	| "chapterDot"
	| "chapterPrefix"
	| "imageShortCaption"
	| "paragraphDot"
>;

let editorDisplaySettings: EditorDisplaySettings = {
	chapterDot: DEFAULT_SETTINGS.chapterDot,
	chapterPrefix: DEFAULT_SETTINGS.chapterPrefix,
	captionSeparator: DEFAULT_SETTINGS.captionSeparator,
	imageShortCaption: DEFAULT_SETTINGS.imageShortCaption,
	paragraphDot: DEFAULT_SETTINGS.paragraphDot,
};

export function setEditorDisplaySettings(
	settings: EditorDisplaySettings,
): void {
	editorDisplaySettings = settings;
}

export function getEditorDisplaySettings(): EditorDisplaySettings {
	return editorDisplaySettings;
}

type PlaceholderType = "img" | "listing" | "table";

export type { PlaceholderType };

export function getPlaceholderLabel(
	type: PlaceholderType,
	number: number | null,
): string {
	const value = number ?? "?";
	if (type === "img")
		return `(${editorDisplaySettings.imageShortCaption ? "рис." : "рисунок"} ${value})`;
	if (type === "listing") return `(листинг ${value})`;
	return `(таблица ${value})`;
}

function findPreviousElementNumber(
	elements: Array<{ pos: number; number: number }>,
	pos: number,
): number | null {
	let found: number | null = null;
	for (const element of elements) {
		if (element.pos >= pos) break;
		found = element.number;
	}
	return found;
}

export function findReferencedElementNumber(
	elements: Array<{ pos: number; number: number }>,
	pos: number,
): number | null {
	return (
		findPreviousElementNumber(elements, pos) ??
		elements.find((element) => element.pos > pos)?.number ??
		null
	);
}

export function getCaptionPrefix(number: number): string {
	const label = editorDisplaySettings.imageShortCaption ? "Рис." : "Рисунок";
	const separator =
		editorDisplaySettings.captionSeparator === "dash" ? " \u2013" : ".";
	return `${label} ${number}${separator} `;
}

export function getElementCaptionPrefix(
	label: "Листинг" | "Таблица",
	number: number,
): string {
	const separator =
		editorDisplaySettings.captionSeparator === "dash" ? " \u2013" : ".";
	return `${label} ${number}${separator} `;
}

export function getChapterPrefix(number: number): string {
	const word = editorDisplaySettings.chapterPrefix ? "Глава " : "";
	const separator = editorDisplaySettings.chapterDot ? ". " : " ";
	return `${word}${number}${separator}`;
}

export function getParagraphPrefix(number: string): string {
	const separator = editorDisplaySettings.paragraphDot ? ". " : " ";
	return `${number}${separator}`;
}

export function getPlainHeadingText(node: ProseNode): string {
	return node.textContent.trim().replace(/^\d+(\.\d+)*\.?\s+/, "");
}

export function isExcludedHeading(node: ProseNode): boolean {
	return HEADING_EXCLUSIONS.includes(getPlainHeadingText(node).toLowerCase());
}

export function hasHeadingNumberPrefix(node: ProseNode): boolean {
	return /^\d+(\.\d+)*\.?\s+/.test(node.textContent.trim());
}

export function hasCaptionPrefix(text: string): boolean {
	return /^Рис(?:унок|\.)\s+\d+(?:\.\d+)?(?:\.|\s+\u2013|-)\s+/u.test(
		text.trim(),
	);
}

export function hasTableCaptionPrefix(text: string): boolean {
	return /^Таблица\s+\d+(?:\.|\s+\u2013|-)\s+/u.test(text.trim());
}

export function getListingCaptionFromLanguage(language: unknown): string {
	if (typeof language !== "string") return "";
	return language
		.trim()
		.replace(/^\S+\s*/, "")
		.trim();
}
