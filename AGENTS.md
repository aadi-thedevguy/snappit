# Repository guidelines

These instructions apply to the entire Snappit repository. Follow them for all changes unless the user explicitly directs otherwise. Keep changes consistent with the surrounding code and the package boundaries described below.

## Approval before implementation

- Before implementing a requested code or configuration change, first inspect the relevant files and summarize the proposed change, then get the user's approval to proceed.
- Do not treat a request to inspect, plan, or review as approval to implement. When the user explicitly asks for a concrete change (including creating or editing an instruction file), that request is the approval for that change; do not ask for the same approval again.
- Once approval is given, complete the approved work without asking again for routine implementation decisions. Ask again only if the scope or impact materially changes.

## Project layout and ownership

- This is a pnpm 10.28.0 and Turborepo monorepo. Keep code in the package or app that owns the behavior; use existing workspace packages for code shared between apps.
- `apps/web` contains the Next.js App Router application. Keep routes in `app/`, reusable application components in `components/`, and shared web helpers in `lib/`.
- `apps/web/constants/index.ts` is the home for web application constants. Put reusable constants there rather than scattering configuration values through components or routes.
- Put reusable TypeScript declarations and domain types in an appropriate `types` module or alongside the package that owns the domain. Prefer inferred types from schemas and APIs over duplicating their shape. Do not create a `types` file for a type used only by one small implementation when a nearby declaration is clearer.
- `apps/video-worker` owns the long-running video processing worker. Keep processing functions, handlers, services, media operations, and worker configuration in their existing worker modules.
- `extension/` owns the Chrome extension. Keep extension-specific browser scripts and assets there; do not add web-app runtime dependencies to it.
- `packages/db`, `packages/inngest`, `packages/validation`, and `packages/video-storage` own shared database, event, validation, and storage code respectively. Avoid importing application internals into shared packages.
- Follow existing import aliases and package exports. Do not reach across package boundaries through another package's private source paths.

## TypeScript and implementation style

- Follow the existing TypeScript style: explicit, descriptive names; small focused functions; and imports from the owning package's public API.
- Validate external input at boundaries with the existing Zod schemas or the appropriate shared validation package. Keep event and data contracts in the shared package that owns them.
- Keep server-only credentials and operations on the server or worker. Do not expose secrets in client bundles, extension code, or logs.
- Prefer the existing libraries and utilities (including `cn` from `apps/web/lib/utils.ts`) over introducing duplicate helpers or dependencies.
- Match the existing file naming and module conventions in the directory being changed. The worker uses ESM imports with `.js` extensions in TypeScript source where shown by the surrounding code.

## Web UI and styling

- Reuse components from `apps/web/components/ui/` (the project's shadcn component directory) before building a new primitive. If a needed shadcn component is missing, add it using the shadcn CLI and this app's `components.json` configuration, then compose it for the feature.
- Do not hand-roll a replacement for an available shadcn/Radix primitive. Build custom components only when the existing UI components do not cover the product need.
- Use Tailwind CSS utilities for layout, responsive styling, states, and animations. Follow the existing Tailwind v4 setup and shared styles in `apps/web/app/globals.css`; avoid adding a separate styling system or unnecessary inline styles.
- Use Lucide icons through the existing `lucide-react` dependency and follow the existing accessible labeling and interaction patterns.
- Preserve responsive behavior, keyboard access, and semantic HTML when changing UI.

## Tests and verification

- Do not add tests mechanically or for every small change. Add focused tests when they cover meaningful behavior, a regression risk, or a boundary with nontrivial logic.
- Extend the existing test location and runner for the owning package. The web app uses `pnpm --filter @snappit/web test`; the worker and shared packages have their own package scripts.
- Run the narrowest relevant checks first, then broader checks when the change or repository scripts warrant them. Report checks that could not be run and why.
- Do not change unrelated code merely to make an unrelated test or lint failure disappear.

## Commits

- Use Conventional Commits, with a lowercase type, optional scope, and imperative summary: `type(scope): summary` (for example, `fix(app): handle expired upload links`).
- Choose a standard type such as `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, or `chore`. Use a concise, specific summary and omit the period at the end.
- Keep each commit focused on one logical change. Follow the same message shape used by the popular `better-commit` CLI.

## Dependencies and generated files

- Prefer existing dependencies. Add or update dependencies only when the requested work needs them, and use pnpm workspace commands so the lockfile stays in sync.
- Avoid editing generated output or build artifacts by hand. Update the source or generator input that owns them.
- Preserve package scripts and workspace boundaries; use the root scripts for repository-wide build, lint, typecheck, and test tasks where appropriate.
