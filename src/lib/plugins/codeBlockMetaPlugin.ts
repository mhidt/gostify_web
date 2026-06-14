import { $remark } from "@milkdown/kit/utils";

export const codeBlockMetaPlugin = $remark(
	"code-block-meta",
	() => () => (tree) => {
		const visit = (node: unknown): void => {
			if (!node || typeof node !== "object") return;

			const current = node as {
				type?: string;
				lang?: unknown;
				meta?: unknown;
				children?: unknown[];
			};
			if (
				current.type === "code" &&
				typeof current.meta === "string" &&
				current.meta.trim()
			) {
				current.lang =
					`${typeof current.lang === "string" ? current.lang : ""} ${current.meta.trim()}`.trim();
				current.meta = undefined;
			}

			current.children?.forEach(visit);
		};

		visit(tree);
	},
);
