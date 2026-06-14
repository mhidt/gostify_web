import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import {
	getElementCaptionPrefix,
	hasTableCaptionPrefix,
} from "./_shared/captionUtils";

export const tableCaptionPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("table-caption"),
			props: {
				decorations(state) {
					const decorations: Decoration[] = [];
					let tableNumber = 0;
					let previousNode: ProseNode | null = null;
					let previousOffset = 0;

					state.doc.forEach((node, offset) => {
						if (node.type.name === "table") {
							tableNumber += 1;
							decorations.push(
								Decoration.node(offset, offset + node.nodeSize, {
									class: "gost-table",
								}),
							);

							if (
								previousNode?.type.name === "paragraph" &&
								previousNode.textContent.trim().length > 0
							) {
								decorations.push(
									Decoration.node(
										previousOffset,
										previousOffset + previousNode.nodeSize,
										{
											class: "gost-table-caption",
										},
									),
								);

								if (!hasTableCaptionPrefix(previousNode.textContent)) {
									decorations.push(
										Decoration.widget(
											previousOffset + 1,
											() => {
												const span = document.createElement("span");
												span.className = "gost-table-caption-prefix";
												span.textContent = getElementCaptionPrefix(
													"Таблица",
													tableNumber,
												);
												span.setAttribute("contenteditable", "false");
												return span;
											},
											{ side: -1 },
										),
									);
								}
							}
						}

						previousNode = node;
						previousOffset = offset;
					});

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);
