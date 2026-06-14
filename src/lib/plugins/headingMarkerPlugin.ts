import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

export const headingMarkerPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("heading-markers"),
			props: {
				decorations(state) {
					const decorations: Decoration[] = [];
					const { selection } = state;

					state.doc.descendants((node, pos) => {
						if (node.type.name !== "heading") return;

						const start = pos + 1;
						const end = pos + node.nodeSize;
						const cursorInside =
							start <= selection.from && selection.from <= end;
						if (!cursorInside) return;

						decorations.push(
							Decoration.widget(
								start,
								() => {
									const span = document.createElement("span");
									span.className = "heading-marker";
									span.textContent = `${"#".repeat(Number(node.attrs.level) || 1)} `;
									span.setAttribute("aria-hidden", "true");
									span.setAttribute("contenteditable", "false");
									return span;
								},
								{ side: -1 },
							),
						);
					});

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);
