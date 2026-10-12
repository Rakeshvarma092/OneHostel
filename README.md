# OneHostel — UI Architecture (Angular + Angular Material)

Angular 18, standalone components, Angular Material only (no third-party UI kits).

## 1. Folder structure

```
src/
  app/
    core/                     # App-wide singletons, loaded once (no UI)
      services/               # AuthService, ConfigService, etc.
      guards/                 # authGuard, roleGuard (functional guards)
      interceptors/           # auth, error, loading interceptors
      models/                 # Cross-app TypeScript interfaces/types
    layout/                   # App shell — smart containers only
      main-layout/            # Owns sidenav state, wires header+sidebar+footer
      sidebar/
      footer/
    shared/                   # Reusable, feature-agnostic UI building blocks
      components/
        button/               # app-button (Common Buttons)
        table/                # app-table (Common Table)
        header/               # app-header (Common Header)
        form-error/           # app-form-error (validation messages)
      directives/             # e.g. appAutofocus, appDebounceClick
      pipes/                  # e.g. appInitials, appFileSize
      validators/             # custom-validators.ts, validation-messages.ts
      material/               # material-imports.ts barrel
    features/                 # One folder per business capability
      dashboard/
      students/               # (example — add as needed)
        components/           # Feature-only presentational components
        pages/                # Routed smart components ("pages")
        <feature>.routes.ts   # Lazy-loaded route definitions
    app.component.ts
    app.config.ts             # providers: router, animations, http
    app.routes.ts
  styles/
    _colors.scss              # Global color system (palettes + CSS vars)
    _theme.scss               # Angular Material theme wiring
    _typography.scss          # Non-Material type scale
  styles.scss                 # Root stylesheet, imports the above
```

Rules of thumb:
- `core` is imported once, has no components, and never imports from `features`.
- `shared` has no knowledge of any specific feature and is imported everywhere.
- `features/*` may import from `core` and `shared`, never from another feature directly (route through a shared service or the router instead).
- Every feature is lazy-loaded via `loadComponent` / `loadChildren` in `app.routes.ts`.

## 2. Smart vs. presentational components

- **Smart (container) components** — one per routed page or layout region (`MainLayoutComponent`, `DashboardComponent`). They inject services, hold state, and pass data down / listen to events up. Not meant to be reused elsewhere.
- **Presentational (dumb) components** — everything in `shared/components/*` (`AppButtonComponent`, `AppTableComponent`, `AppHeaderComponent`, `AppFormErrorComponent`). They only receive `@Input()`s and emit `@Output()`s, have no service dependencies, and are trivially reusable and testable.

`MainLayoutComponent` is the canonical example: it owns `sidenavOpened` and the current user, and `AppHeaderComponent`/`SidebarComponent` just render what they're given and emit events back up.

## 3. Angular Material modules in use

| Area | Modules |
|---|---|
| Layout / navigation | `MatToolbarModule`, `MatSidenavModule`, `MatListModule` |
| Actions | `MatButtonModule`, `MatIconModule`, `MatMenuModule` |
| Data display | `MatTableModule`, `MatSortModule`, `MatPaginatorModule`, `MatCardModule`, `MatDividerModule`, `MatBadgeModule` |
| Forms | `MatFormFieldModule`, `MatInputModule`, `MatSelectModule`, `MatCheckboxModule` |
| Feedback | `MatProgressSpinnerModule`, `MatTooltipModule`, `MatDialogModule`, `MatSnackBarModule` |

All are re-exported from [`shared/material/material-imports.ts`](src/app/shared/material/material-imports.ts) so components import a single `MATERIAL_IMPORTS` array (or cherry-pick modules directly) instead of repeating long import lists — while standalone components mean unused modules still tree-shake out.

## 4. Theming

- [`styles/_colors.scss`](src/styles/_colors.scss) is the **single source of truth** for color: Material palette maps (for `mat.define-palette`) plus CSS custom properties (`--color-primary`, `--color-surface`, etc.) for anything outside Material.
- [`styles/_theme.scss`](src/styles/_theme.scss) builds a light theme and a dark theme from those palettes via `mat.define-light-theme` / `mat.define-dark-theme`, and applies them with `mat.all-component-themes`.
- Dark mode is a CSS class (`.dark-theme` on `<body>`), toggled at runtime (e.g. from a settings service) — never a duplicated stylesheet.
- Never hardcode hex values in component `.scss` files — reference the CSS custom property or, for Material-owned surfaces, let the theme mixins handle it.

## 5. Layout structure

`MainLayoutComponent` is the single app shell:

```
app-header (sticky mat-toolbar)
├─ mat-sidenav-container
│  ├─ mat-sidenav (app-sidebar, mode="side" on desktop, "over" on handset)
│  └─ mat-sidenav-content
│     ├─ <router-outlet> (page content)
│     └─ app-footer
```

Header, sidebar and footer are each independent, reusable components; the layout component's only job is composition and responsive state.

## 6. Responsive design

- Drive breakpoints with `@angular/cdk/layout`'s `BreakpointObserver` (see `MainLayoutComponent.isHandset$`) rather than hand-rolled `window.resize` listeners — it's what switches the sidenav between `side` (desktop) and `over` (handset) mode.
- Use Angular Material's own responsive primitives first: `mat-sidenav` modes, `MatTable`'s natural horizontal scroll inside a wrapping `div`, `fxLayout`-free CSS Grid/Flexbox in component styles.
- Keep breakpoints consistent by using CDK's `Breakpoints` constants, not magic pixel values scattered across files.
- Test every shared component at 320px, 768px, and 1440px minimum before merging.

## 7. Naming conventions

- **Components**: `app-<name>` selector, `<Name>Component` class, one component per folder (`kebab-case` folder name matching the selector).
- **Shared/common components**: prefixed `App` (`AppButtonComponent`, `AppTableComponent`) to distinguish them from Material's own `Mat*` components and from feature-specific components.
- **Services**: `<Name>Service`, one per responsibility (`AuthService`, `ResidentService`), always `providedIn: 'root'` unless intentionally feature-scoped.
- **Files**: `<name>.component.ts/.html/.scss`, `<name>.service.ts`, `<name>.guard.ts`, `<name>.interceptor.ts`, `<name>.routes.ts`.
- **Styles**: CSS custom properties in `kebab-case` (`--color-primary`), BEM-ish class names scoped by component (`app-table__actions-header`, `app-table--loading`).
- **Inputs/Outputs**: verbs for outputs (`rowClick`, `menuToggle`, `logout`), nouns/adjectives for inputs (`loading`, `disabled`, `columns`).

## 8. Organizing shared UI vs. feature modules

- If a component/pipe/directive is used by **two or more features**, it belongs in `shared/`. If it's used by exactly one feature, keep it inside that feature's own `components/` folder — don't preemptively move things to `shared` "just in case."
- `shared/components/*` never imports from `core/services` or `features/*` — it only depends on Angular, CDK and Material.
- Each feature folder is self-contained and lazy-loaded; a feature is deletable without breaking any other feature.

## 9. Accessibility & consistency

- Every icon-only control has `[attr.aria-label]` (see `AppButtonComponent`, `AppHeaderComponent`) — never ship an icon button without one.
- Use `mat-error` (via `AppFormErrorComponent`) rather than plain `<div>`s so screen readers get the built-in `aria-live` / `aria-describedby` wiring Material already provides on `mat-form-field`.
- Preserve Material's built-in focus indicators and keyboard navigation (`mat-menu`, `mat-sidenav`, `mat-table` sort headers) — don't override `outline: none` anywhere.
- Maintain WCAG AA contrast for every custom palette color (verify with the Material theme contrast checker when picking new palette values in `_colors.scss`).
- Consistency comes from routing every button, table and form field through the shared components rather than raw `mat-*` directives in feature code — one place to fix a bug or update a style.

## 10. High-level architecture diagram (description)

```
                          ┌─────────────────────────┐
                          │        AppComponent       │
                          │      <router-outlet>      │
                          └────────────┬─────────────┘
                                       │
                          ┌────────────▼─────────────┐
                          │     MainLayoutComponent    │  (smart)
                          │  ┌───────┐ ┌─────────────┐ │
                          │  │Header │ │  Sidenav     │ │
                          │  └───────┘ │ ┌─────────┐  │ │
                          │            │ │ Sidebar │  │ │
                          │            │ └─────────┘  │ │
                          │            │ ┌─────────┐  │ │
                          │            │ │ <router-│  │ │
                          │            │ │  outlet>│  │ │
                          │            │ └────┬────┘  │ │
                          │            │      │Footer │ │
                          │            └──────┼───────┘ │
                          └───────────────────┼─────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │                        │                        │
             ┌───────▼───────┐       ┌────────▼────────┐      ┌────────▼────────┐
             │ Feature: Dash │       │ Feature: Students │      │ Feature: Rooms   │
             │  board (page)  │      │   (lazy loaded)    │      │  (lazy loaded)   │
             └───────┬───────┘       └────────┬────────┘      └────────┬────────┘
                     │                        │                        │
                     └────────── all consume ─┴────────────────────────┘
                                              │
                                 ┌────────────▼─────────────┐
                                 │      shared/components     │
                                 │  AppButton · AppTable ·    │
                                 │  AppHeader · AppFormError  │
                                 └────────────┬─────────────┘
                                              │
                                 ┌────────────▼─────────────┐
                                 │      Angular Material      │
                                 │   (themed via _theme.scss) │
                                 └───────────────────────────┘
```

## Common / shared deliverables in this scaffold

| Requirement | File(s) |
|---|---|
| Common Buttons | [`shared/components/button/app-button.component.ts`](src/app/shared/components/button/app-button.component.ts) — variants: `primary`, `secondary`, `stroked`, `text`, `icon`; supports `loading`, `icon`, `disabled` |
| Common Table | [`shared/components/table/app-table.component.ts`](src/app/shared/components/table/app-table.component.ts) — generic `<T>`, sorting, pagination, loading/empty states, custom cell & row-actions templates |
| Common Header | [`shared/components/header/app-header.component.ts`](src/app/shared/components/header/app-header.component.ts) — toolbar, menu toggle, notifications badge, user menu |
| Global Color / Theme system | [`styles/_colors.scss`](src/styles/_colors.scss) + [`styles/_theme.scss`](src/styles/_theme.scss) |
| Common Form Validation | [`shared/validators/custom-validators.ts`](src/app/shared/validators/custom-validators.ts), [`shared/validators/validation-messages.ts`](src/app/shared/validators/validation-messages.ts), [`shared/components/form-error/app-form-error.component.ts`](src/app/shared/components/form-error/app-form-error.component.ts) |

See [`features/dashboard`](src/app/features/dashboard/dashboard.component.ts) for a worked example that composes all five together.

## Authentication

```
core/
  models/auth.models.ts        # LoginRequest, LoginResponse, AuthUser
  services/auth.service.ts     # login/logout, token storage, currentUser$ stream
  guards/auth.guard.ts         # authGuard (protect), guestGuard (keep signed-in users off /login)
  interceptors/auth.interceptor.ts  # attaches Bearer token, forces logout on 401
features/
  auth/
    login/
      login.component.ts/.html/.scss
environments/
  environment.ts / environment.prod.ts   # apiUrl per build config
```

**Flow**: `LoginComponent` submits a `LoginRequest` via `AuthService.login()`, which `POST`s to `${environment.apiUrl}/auth/login`, stores the token + user in `localStorage` (Remember me) or `sessionStorage` (tab-only), and pushes the user onto `currentUser$`. `authInterceptor` attaches that token to every outgoing request and calls `logout()` automatically on a 401. `authGuard` blocks the shell route (`''` in `app.routes.ts`) for anyone without a token and redirects to `/login?returnUrl=...`; `guestGuard` does the reverse for `/login`. `MainLayoutComponent` subscribes to `currentUser$` for the header and calls `authService.logout()` when the header's `(logout)` output fires, which clears storage and navigates back to `/login`.

Swap the placeholder `apiUrl` in `src/environments/environment.ts` for your real auth endpoint before going to production, and adjust `LoginResponse`/`AuthUser` to match your backend's payload shape.

## Getting started

```bash
npm install
npm start
```
