import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { NodeSelection, Plugin, PluginKey } from "@milkdown/kit/prose/state";
import type { EditorView, NodeView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

function parseImageAlt(alt: unknown): {
	baseAlt: string;
	requestedWidth?: number;
} {
	const text = typeof alt === "string" ? alt : "";
	const pipeIndex = text.lastIndexOf("|");
	if (pipeIndex === -1) return { baseAlt: text };

	const baseAlt = text.slice(0, pipeIndex).trim();
	const requestedWidth = parseInt(text.slice(pipeIndex + 1), 10);
	return {
		baseAlt: baseAlt || text,
		requestedWidth: Number.isFinite(requestedWidth)
			? requestedWidth
			: undefined,
	};
}

function clampImageWidth(width: number, maxWidth: number): number {
	return Math.round(Math.max(80, Math.min(width, maxWidth)));
}

class ResizableImageView implements NodeView {
	dom: HTMLElement;
	private image: HTMLImageElement;
	private node: ProseNode;
	private view: EditorView;
	private getPos: () => number | undefined;

	constructor(
		node: ProseNode,
		view: EditorView,
		getPos: (() => number | undefined) | boolean,
	) {
		this.node = node;
		this.view = view;
		this.getPos = typeof getPos === "function" ? getPos : () => undefined;

		this.dom = document.createElement("span");
		this.dom.className = "resizable-image-node";
		this.dom.setAttribute("contenteditable", "false");

		this.image = document.createElement("img");
		this.image.draggable = false;
		this.dom.appendChild(this.image);

		this.dom.appendChild(this.createHandle("top-left", "left"));
		this.dom.appendChild(this.createHandle("top-right", "right"));
		this.dom.appendChild(this.createHandle("bottom-left", "left"));
		this.dom.appendChild(this.createHandle("bottom-right", "right"));
		this.dom.addEventListener("mousedown", this.selectImage);
		this.render();
	}

	update(node: ProseNode): boolean {
		if (node.type !== this.node.type) return false;

		this.node = node;
		this.render();
		return true;
	}

	selectNode(): void {
		this.dom.classList.add("is-selected");
	}

	deselectNode(): void {
		this.dom.classList.remove("is-selected");
	}

	stopEvent(event: Event): boolean {
		return this.dom.contains(event.target as HTMLElement);
	}

	ignoreMutation(): boolean {
		return true;
	}

	destroy(): void {
		this.dom.removeEventListener("mousedown", this.selectImage);
	}

	private render(): void {
		const { src, title } = this.node.attrs;
		const { baseAlt, requestedWidth } = parseImageAlt(this.node.attrs.alt);

		this.image.src = typeof src === "string" ? src : "";
		this.image.alt = baseAlt;
		this.image.title = typeof title === "string" ? title : "";
		this.image.style.width = requestedWidth ? `${requestedWidth}px` : "";
	}

	private createHandle(
		corner: "top-left" | "top-right" | "bottom-left" | "bottom-right",
		side: "left" | "right",
	): HTMLElement {
		const handle = document.createElement("span");
		handle.className = `resizable-image-handle resizable-image-handle-${corner}`;
		handle.addEventListener("mousedown", (event) =>
			this.startResize(event, side),
		);
		return handle;
	}

	private selectImage = (event: MouseEvent): void => {
		event.preventDefault();
		const pos = this.getPos();
		if (typeof pos !== "number") return;

		this.view.dispatch(
			this.view.state.tr.setSelection(
				NodeSelection.create(this.view.state.doc, pos),
			),
		);
		this.view.focus();
	};

	private startResize(event: MouseEvent, side: "left" | "right"): void {
		event.preventDefault();
		event.stopPropagation();
		this.selectImage(event);

		const startX = event.clientX;
		const startWidth = this.image.getBoundingClientRect().width;
		const maxWidth = Math.max(
			80,
			this.dom.parentElement?.clientWidth ?? startWidth,
		);

		const onMouseMove = (moveEvent: MouseEvent) => {
			const delta = moveEvent.clientX - startX;
			const nextWidth =
				side === "right" ? startWidth + delta : startWidth - delta;
			this.image.style.width = `${clampImageWidth(nextWidth, maxWidth)}px`;
		};

		const onMouseUp = () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			this.commitWidth(this.image.getBoundingClientRect().width);
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}

	private commitWidth(width: number): void {
		const pos = this.getPos();
		if (typeof pos !== "number") return;

		const { baseAlt } = parseImageAlt(this.node.attrs.alt);
		const nextAlt = `${baseAlt}|${clampImageWidth(width, this.dom.parentElement?.clientWidth ?? width)}`;
		const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
			...this.node.attrs,
			alt: nextAlt,
		});

		this.view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, pos)));
	}
}

export const resizableImagePlugin = $prose(
	() =>
		new Plugin({
			key: new PluginKey("resizable-images"),
			props: {
				nodeViews: {
					image: (node, view, getPos) =>
						new ResizableImageView(node, view, getPos),
				},
			},
		}),
);
