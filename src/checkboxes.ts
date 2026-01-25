/**
 * Tri-state checkbox handler: [ ] → [/] → [x] → [ ]
 *
 * Implementation notes:
 * - Live Preview: Uses CodeMirror's posAtDOM() for line detection, updates via editor
 * - Reading mode: Counts checkbox index in DOM, finds Nth task in file, updates via vault
 * - Double requestAnimationFrame to sync checkbox after CM re-renders
 */

import { MarkdownView } from "obsidian";
import type RollPlugin from "../main";
import { isInPluginFolder } from "./utils/files";
import { getNextTaskState, parseTaskLine, type TaskState } from "./utils/tasks";

/**
 * Register checkbox handler for tri-state toggling: [ ] → [/] → [x] → [ ]
 */
export function registerCheckboxes(plugin: RollPlugin): void {
	const handler = createCheckboxHandler(plugin);
	plugin.registerDomEvent(document, "click", handler, true);
}

/**
 * Creates a click handler for tri-state checkbox toggling: [ ] → [/] → [x] → [ ]
 * Register with capture phase to intercept before Obsidian's handler.
 */
function createCheckboxHandler(plugin: RollPlugin) {
	return (evt: MouseEvent): void => {
		const target = evt.target as HTMLElement;

		// --- Can we handle this click? If not, let Obsidian handle it ---
		if (!isTaskCheckbox(target)) return;

		const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const file = activeView.file;
		if (!file || !isInPluginFolder(file.path, plugin.settings.rollFolder))
			return;

		const isReadingMode = activeView.getMode() === "preview";

		if (isReadingMode) {
			handleReadingModeClick(evt, target, plugin, file.path);
		} else {
			handleLivePreviewClick(evt, target, activeView);
		}
	};
}

/**
 * Handle checkbox click in Live Preview / Source mode
 * Uses CodeMirror to find line and update editor directly
 */
function handleLivePreviewClick(
	evt: MouseEvent,
	target: HTMLElement,
	view: MarkdownView,
): void {
	if (!view.editor) return;

	const lineNumber = getLineNumberFromCheckbox(target, view);
	if (lineNumber === null) return;

	// --- We can handle it - prevent Obsidian's default toggle ---
	evt.preventDefault();
	evt.stopPropagation();

	// Read state from markdown source (DOM data-task may be stale)
	const editor = view.editor;
	const lineContent = editor.getLine(lineNumber);
	const parsed = parseTaskLine(lineContent);
	if (!parsed) return;

	// Toggle to next state and update editor
	const nextState = getNextTaskState(parsed.state);
	editor.setLine(lineNumber, `${parsed.prefix}${nextState}${parsed.suffix}`);

	// Sync DOM checkbox after CodeMirror re-renders
	syncCheckboxStateLivePreview(target, nextState);
}

/**
 * Handle checkbox click in Reading mode
 * Uses DOM position to find task index, then updates file via vault API
 */
function handleReadingModeClick(
	evt: MouseEvent,
	target: HTMLElement,
	plugin: RollPlugin,
	filePath: string,
): void {
	// Get current state from DOM (li parent has data-task)
	const listItem = target.closest("li[data-task]");
	if (!listItem) return;

	const currentState = (listItem.getAttribute("data-task") || " ") as TaskState;
	const nextState = getNextTaskState(currentState);

	// Find this checkbox's index among all checkboxes in the preview
	const previewContainer = target.closest(".markdown-preview-view");
	if (!previewContainer) return;

	const allCheckboxes = Array.from(
		previewContainer.querySelectorAll(
			"li.task-list-item > input.task-list-item-checkbox",
		),
	);
	const checkboxIndex = allCheckboxes.indexOf(target as HTMLInputElement);
	if (checkboxIndex === -1) return;

	// --- We can handle it - prevent Obsidian's default toggle ---
	evt.preventDefault();
	evt.stopPropagation();

	// Update file content - find the Nth task line
	const file = plugin.app.vault.getAbstractFileByPath(filePath);
	if (!file || !("extension" in file)) return;

	void plugin.app.vault.process(file as import("obsidian").TFile, (content) => {
		const lines = content.split("\n");
		let taskCount = 0;

		for (let i = 0; i < lines.length; i++) {
			const parsed = parseTaskLine(lines[i]);
			if (parsed) {
				if (taskCount === checkboxIndex) {
					lines[i] = `${parsed.prefix}${nextState}${parsed.suffix}`;
					return lines.join("\n");
				}
				taskCount++;
			}
		}

		return content;
	});

	// Update DOM immediately for responsive feel
	listItem.setAttribute("data-task", nextState);
	if (target instanceof HTMLInputElement) {
		target.checked = nextState === "x";
	}
	// Update is-checked class
	if (nextState === " ") {
		listItem.classList.remove("is-checked");
	} else {
		listItem.classList.add("is-checked");
	}
}

function isTaskCheckbox(target: HTMLElement): boolean {
	if (!(target instanceof HTMLInputElement)) return false;
	if (target.type !== "checkbox") return false;
	if (!target.classList.contains("task-list-item-checkbox")) return false;
	// Exclude checkboxes in roll-next preview (they navigate instead of toggle)
	if (target.closest(".roll-next-container")) return false;
	return true;
}

function getLineNumberFromCheckbox(
	checkbox: HTMLElement,
	view: MarkdownView,
): number | null {
	// @ts-expect-error - cm exists at runtime but not in type definitions
	const cm = view.editor.cm;
	if (!cm) return null;

	try {
		const pos = cm.posAtDOM(checkbox);
		return cm.state.doc.lineAt(pos).number - 1; // CM is 1-indexed, Editor is 0-indexed
	} catch {
		return null;
	}
}

function syncCheckboxStateLivePreview(
	target: HTMLElement,
	newState: TaskState,
): void {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			const checkbox = target
				.closest(".cm-line")
				?.querySelector(
					"input.task-list-item-checkbox",
				) as HTMLInputElement | null;
			if (checkbox) checkbox.checked = newState === "x";
		});
	});
}
