import { Fragment } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { isPageBreakParagraph } from "./_shared/nodeUtils";

export const pageBreakDisplayPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("page-break-display"),
			props: {
				decorations(state) {
					const decorations: Decoration[] = [];

					state.doc.forEach((node, offset) => {
						if (!isPageBreakParagraph(node)) return;

						decorations.push(
							Decoration.node(offset, offset + node.nodeSize, {
								class: "editor-page-break",
							}),
						);
					});

					return DecorationSet.create(state.doc, decorations);
				},
			},
		}),
);

export const pageBreakPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("page-break-shortcut"),
			props: {
				handleKeyDown(view, event) {
					if (event.key !== "Enter" || !event.ctrlKey || !event.shiftKey)
						return false;

					event.preventDefault();
					const { schema, selection } = view.state;
					const { from, to, empty, $from } = selection;

					if (empty) {
						for (let depth = $from.depth; depth > 0; depth -= 1) {
							const node = $from.node(depth);
							if (
								node.type.name !== "bullet_list" &&
								node.type.name !== "ordered_list"
							)
								continue;

							const paragraph = schema.nodes.paragraph;
							if (!paragraph) break;

							const breakParagraph = paragraph.create(null, schema.text("---"));
							const nextParagraph = paragraph.create();
							const insertPos = $from.after(depth);
							const tr = view.state.tr.insert(
								insertPos,
								Fragment.fromArray([breakParagraph, nextParagraph]),
							);
							view.dispatch(
								tr
									.setSelection(
										TextSelection.create(
											tr.doc,
											insertPos + breakParagraph.nodeSize + 1,
										),
									)
									.scrollIntoView(),
							);
							return true;
						}
					}

					view.dispatch(
						view.state.tr.insertText("\n---\n", from, to).scrollIntoView(),
					);
					return true;
				},
			},
		}),
);
