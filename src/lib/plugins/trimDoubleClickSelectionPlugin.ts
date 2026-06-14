import {
	Plugin,
	PluginKey,
	type Selection,
	TextSelection,
} from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";

export const trimDoubleClickSelectionPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("trim-double-click-selection"),
			props: {
				handleDOMEvents: {
					mouseup(view, event) {
						if ((event as MouseEvent).detail !== 2) return false;

						window.requestAnimationFrame(() => {
							window.requestAnimationFrame(() => {
								const { state } = view;
								const { from, to, empty } = state.selection as Selection;
								if (empty || from >= to) return;

								const selected = state.doc.textBetween(from, to, "\n", "\n");
								const trimmedRight = selected.replace(/\s+$/u, "");
								const trimmedLeft = trimmedRight.replace(/^\s+/u, "");
								if (trimmedLeft.length === selected.length) return;

								const leading = trimmedRight.length - trimmedLeft.length;
								const nextFrom = from + leading;
								const nextTo = nextFrom + trimmedLeft.length;
								if (nextFrom >= nextTo) return;

								view.dispatch(
									state.tr.setSelection(
										TextSelection.create(state.doc, nextFrom, nextTo),
									),
								);
							});
						});

						return false;
					},
				},
				handleDoubleClick(view) {
					window.requestAnimationFrame(() => {
						const { state } = view;
						const { from, to, empty } = state.selection as Selection;
						if (empty || from >= to) return;

						const selected = state.doc.textBetween(from, to, "\n", "\n");
						const trimmed = selected.trim();
						if (trimmed.length === selected.length) return;

						const leading = selected.length - selected.trimStart().length;
						const nextFrom = from + leading;
						const nextTo = nextFrom + trimmed.length;
						view.dispatch(
							state.tr.setSelection(
								TextSelection.create(state.doc, nextFrom, nextTo),
							),
						);
					});

					return false;
				},
			},
		}),
);
