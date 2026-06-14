import type { Node as ProseNode } from "@milkdown/kit/prose/model";

const OPEN_QUOTE = "\u00AB";
const CLOSE_QUOTE = "\u00BB";

export { CLOSE_QUOTE, OPEN_QUOTE };

export function charAt(doc: ProseNode, pos: number): string {
	if (pos < 0 || pos >= doc.content.size) return "";
	return doc.textBetween(pos, pos + 1);
}

export function lineTextBefore(doc: ProseNode, pos: number): string {
	const before = doc.textBetween(0, pos, "\n", "\n");
	const lineStart = before.lastIndexOf("\n") + 1;
	return before.slice(lineStart);
}

export function hasUnclosedQuote(doc: ProseNode, pos: number): boolean {
	let depth = 0;
	for (const char of lineTextBefore(doc, pos)) {
		if (char === OPEN_QUOTE) depth += 1;
		if (char === CLOSE_QUOTE) depth -= 1;
	}
	return depth > 0;
}
