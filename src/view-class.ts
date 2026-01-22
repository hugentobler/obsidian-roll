import { MarkdownView, type WorkspaceLeaf } from "obsidian";
import type RollPlugin from "../main";
import { isInPluginFolder } from "./utils/files";

const ROLL_PAGE_CLASS = "plugin-roll";

/**
 * Track the active Markdown view and scope plugin styling to its container.
 */
export function registerPageViewClass(plugin: RollPlugin): void {
	let activeContainer: HTMLElement | null = null;

	const updateActiveLeaf = (leaf?: WorkspaceLeaf | null): void => {
		if (activeContainer) {
			activeContainer.classList.remove(ROLL_PAGE_CLASS);
			activeContainer = null;
		}

		const view =
			leaf?.view ?? plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		if (!(view instanceof MarkdownView)) return;
		if (!view.file) return;

		const inRollFolder = isInPluginFolder(
			view.file.path,
			plugin.settings.rollFolder,
		);
		const isRollPage = plugin.detectPageType(view.file.path) !== null;
		if (!inRollFolder || !isRollPage) return;

		activeContainer = view.containerEl;
		activeContainer.classList.add(ROLL_PAGE_CLASS);
	};

	plugin.registerEvent(
		plugin.app.workspace.on("active-leaf-change", updateActiveLeaf),
	);
	plugin.registerEvent(
		plugin.app.workspace.on("file-open", () => {
			updateActiveLeaf(null);
		}),
	);

	updateActiveLeaf(null);
}
