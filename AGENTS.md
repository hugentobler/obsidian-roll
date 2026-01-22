# Obsidian Roll plugin

## Project snapshot

- Obsidian community plugin (TypeScript → bundled `main.js`).
- Entry point: `main.ts`.
- Release artifacts: `main.js`, `manifest.json`, optional `styles.css`.
- `manifest.json` `id` is stable; `versions.json` maps plugin version → min app version.

## Tooling + commands

- Uses Bun (`bun.lock`), esbuild (`esbuild.config.mjs`), Biome, Vitest.
- Install: `bun install`
- Dev: `bun run dev`
- Build: `bun run build`
- Lint/format: `bun run lint`, `bun run format`
- Tests: `bun test`

## Code layout + patterns

- `main.ts` stays lifecycle-only; feature logic lives in `src/`.
- `src/settings.ts` owns `DEFAULT_SETTINGS` and registration; `main.ts` loads/saves with `loadData`/`saveData`.
- `src/commands.ts` registers `addCommand` entries (stable IDs).
- Page logic lives in `src/pages/*`; helpers in `src/utils/*`.
- Always use `this.register*` helpers so listeners/intervals are cleaned up.

## Operational notes

- `main.js` is generated; don’t hand-edit it.
- Hooks: `lefthook.yml` runs Biome on staged files.
- CI: `.github/workflows/tests.yml` runs `bun test`.

## Obsidian constraints

- Keep operations local/offline by default; no network calls without clear user-facing purpose.
- Don’t read/write outside the vault.
- Keep startup light; defer heavy work until needed.

## Resources

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
