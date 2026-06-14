import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";

export const saveShortcutPlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("save-shortcut"),
			props: {
				handleKeyDown(_view, event) {
					if (!(event.ctrlKey || event.metaKey) || event.code !== "KeyS")
						return false;

					event.preventDefault();
					event.stopPropagation();
					window.dispatchEvent(new CustomEvent("gostify-save"));
					return true;
				},
			},
		}),
);
