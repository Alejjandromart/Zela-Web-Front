# Zela Design System

## 1. Atmosphere & Identity

Zela feels welcoming, calm, and practical. Its light blue surfaces and clear status colors make maintenance requests easy to scan without adding visual noise.

## 2. Color

| Role             | Token                                                | Value                     | Usage                        |
| ---------------- | ---------------------------------------------------- | ------------------------- | ---------------------------- |
| Primary          | `--color-primary`                                  | `#2f76f6`               | Primary actions              |
| Primary emphasis | `--color-primary-hover`                            | `#1d5fdb`               | Brand and emphasized actions |
| Primary soft     | `--color-primary-soft`                             | `#e7f0ff`               | Icon and selected surfaces   |
| Page background  | `--color-background`                               | `#f0f6ff`               | Main page surface            |
| Surface          | `--color-surface`                                  | `#fff`                  | Cards and navigation         |
| Border           | `--color-border`                                   | `#d6e3f7`               | Card and section outlines    |
| Text             | `--color-text`                                     | `#1e293b`               | Headings and body text       |
| Secondary text   | `--color-text-secondary`                           | `#52647b`               | Supporting information       |
| In progress      | `--status-progress-bg`, `--status-progress-text` | `#fff3d6`, `#8a5000`  | In-progress status           |
| Done             | `--status-done-bg`, `--status-done-text`         | `#e0f7ea`, `#166534`  | Completed status             |
| Focus            | `--focus-ring`                                     | `--color-primary-hover` | Visible keyboard focus       |

Status colors are reserved for request state. Other colors come from `frontend/css/tokens.css`.

## 3. Typography

| Level      | Token              | Value        | Usage                                 |
| ---------- | ------------------ | ------------ | ------------------------------------- |
| Display    | `--font-display` | `2rem`     | Brand and large page heading          |
| Heading    | `--font-2xl`     | `1.75rem`  | Main heading                          |
| Section    | `--font-xl`      | `1.375rem` | Section heading and primary card text |
| Body       | `--font-md`      | `1rem`     | Default text                          |
| Supporting | `--font-sm`      | `.875rem`  | Metadata and status labels            |

Font stack: `Inter, system-ui, sans-serif`.

## 4. Spacing & Layout

Spacing uses the `--space-*` tokens in `frontend/css/tokens.css`, based on a 4px unit. Main content is capped at `75rem`; the layout changes at `52rem` and ticket rows gain a separate status column at `68rem`.

## 5. Components

### Recent ticket (`.ticket`)

- **Structure**: list item with category icon, summary, status, and a decorative trailing arrow.
- **Variants**: in-progress and completed status.
- **Spacing**: token-based card padding and grid gaps.
- **States**: links open ticket details; keyboard focus uses the shared visible ring.
- **Accessibility**: status is readable text; decorative icons are hidden from assistive technology.
- **Motion**: none.

### Request card (`.request-card`)

- **Structure**: link with icon, title, and supporting text.
- **Variants**: one primary request action.
- **Spacing**: token-based padding and gaps.
- **States**: default, hover and visible keyboard focus.
- **Accessibility**: native link semantics and a text label.
- **Motion**: none.

## 6. Motion & Interaction

Focusable controls use the shared visible focus ring. Illustrations may contain SVG motion, with reduced-motion preferences respected in their styles. Ticket links and the request card provide navigation to the corresponding flow.

## 7. Depth & Surface

The existing surface strategy is mixed: cards use a tokenized border and the shared soft card shadow, while backgrounds separate the page, card, and icon surfaces.

## Registros e revisão de equipe

Comentários e histórico usam listas cronológicas, autoria e data textual. As listas têm paginação com 20 registros e controles Anterior e Próxima. Os anexos oferecem prévia e download por finalidade. O conflito de equipe usa uma seção de alerta com a composição atual, o rascunho preservado e confirmação explícita antes do reenvio. Exclusões usam um diálogo com Cancelar em foco inicial e erro textual quando houver vínculos. Esses componentes reutilizam os tokens de cores, espaçamento, bordas e foco já definidos.
