import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import { switchCase } from "@/core/editor/utils";

export const changeCasePlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("change-case-shortcut"),
			props: {
				handleKeyDown(view, event) {
					if (event.key !== "F3" || !event.shiftKey) return false;

					const { from, to } = view.state.selection;
					if (from === to) return false;

					event.preventDefault();
					const selected = view.state.doc.textBetween(from, to, "\n", "\n");
					const next = switchCase(selected);
					const tr = view.state.tr.insertText(next, from, to).scrollIntoView();
					view.dispatch(
						tr.setSelection(
							TextSelection.create(tr.doc, from, from + next.length),
						),
					);
					return true;
				},
			},
		}),
);
