import type { Node as ProseNode } from "@milkdown/kit/prose/model";

export function containsImageNode(node: ProseNode): boolean {
	if (node.type.name === "image") return true;

	let found = false;
	node.descendants((child) => {
		if (child.type.name === "image") {
			found = true;
			return false;
		}

		return !found;
	});

	return found;
}

export function isEmptyParagraph(node: ProseNode): boolean {
	return node.type.name === "paragraph" && node.textContent.trim().length === 0;
}

export function isStandaloneImageParagraph(node: ProseNode): boolean {
	return (
		node.type.name === "paragraph" &&
		node.childCount === 1 &&
		node.child(0).type.name === "image"
	);
}

export function isPageBreakParagraph(node: ProseNode): boolean {
	return node.type.name === "paragraph" && node.textContent.trim() === "---";
}
