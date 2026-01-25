import type RollPlugin from "../main";

/**
 * Register ribbon actions
 */
export function registerRibbonActions(plugin: RollPlugin): void {
	plugin.addRibbonIcon(
		"scroll-text",
		"Roll: Open 'Now' page",
		async (_evt: MouseEvent) => {
			await plugin.openNow();
		},
	);
}
