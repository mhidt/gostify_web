import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import {
	findReferencedElementNumber,
	getPlaceholderLabel,
	type PlaceholderType,
} from "./_shared/captionUtils";
import { containsImageNode } from "./_shared/nodeUtils";

export const elementPlaceholderPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("element-placeholder"),
			props: {
				handleDOMEvents: {
					mousedown(view, event) {
						const target = event.target;
						if (!(target instanceof HTMLElement)) return false;

						const placeholder = target.closest<HTMLElement>(
							".element-placeholder",
						);
						if (!placeholder) return false;

						const start = Number(placeholder.dataset.elementStart);
						if (!Number.isFinite(start)) return false;

						event.preventDefault();
						view.focus();
						view.dispatch(
							view.state.tr.setSelection(
								TextSelection.create(view.state.doc, start + 1),
							),
						);
						return true;
					},
				},
				decorations(state) {
					const decorations: Decoration[] = [];
					const elements: Record<
						PlaceholderType,
						Array<{ pos: number; number: number }>
					> = {
						img: [],
						listing: [],
						table: [],
					};
					const { from: selectionFrom, to: selectionTo } = state.selection;

					state.doc.forEach((node, offset) => {
						if (containsImageNode(node)) {
							elements.img.push({
								pos: offset,
								number: elements.img.length + 1,
							});
						}
						if (node.type.name === "code_block") {
							elements.listing.push({
								pos: offset,
								number: elements.listing.length + 1,
							});
						}
						if (node.type.name === "table") {
							elements.table.push({
								pos: offset,
								number: elements.table.length + 1,
							});
						}
					});

					state.doc.descendants((node, pos) => {
						if (!node.isText || !node.text) return;

						const matches = node.text.matchAll(/\{(img|table|listing)}/g);
						for (const match of matches) {
							const index = match.index;
							if (index === undefined) continue;
							const type = match[1] as PlaceholderType;
							const from = pos + index;
							const to = from + match[0].length;
							const selectionTouchesPlaceholder =
								selectionFrom <= to && selectionTo >= from;
							if (selectionTouchesPlaceholder) {
								decorations.push(
									Decoration.inline(from, to, {
										class: "element-placeholder-editing",
									}),
								);
								continue;
							}

							const elementNumber = findReferencedElementNumber(
								elements[type],
								from,
							);
							decorations.push(
								Decoration.inline(from, to, {
									class: "element-placeholder",
									"data-element-label": getPlaceholderLabel(
										type,
										elementNumber,
									),
									"data-element-start": String(from),
								}),
							);
						}
					});

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);

export const imagePlaceholderPlugin = elementPlaceholderPlugin;
