# Design Reference — SistemaTareas

Design references for the planned personal organizer app. These two references
were reviewed on 2026-09-22 and define the expected look and structure of the
application.

## Reference 1 — Lovable "Estudia" (app shell + dashboard format)

Source: Lovable project exported code (formerly in `Ejemplo/`, reviewed and
removed; this document is the canonical record).

This is the **overall application format** the user expects: a student
dashboard organizer called **"Estudia"** with navigation to Tareas,
Calendario, Materias and Documentos.

### Tech stack observed

- TanStack Start (file-based routing under `routes/`) + TanStack Router
- TanStack Query (`QueryClient` provided at root)
- React
- Tailwind CSS v4 (oklch design tokens, `@theme inline`)
- lucide-react icons
- shadcn-style UI primitives (`Button`, `cn` utility with clsx + tailwind-merge)

### Routes

| Route         | Page       | Purpose                       |
| ------------- | ---------- | ----------------------------- |
| `/`           | Dashboard  | Daily academic overview       |
| `/tareas`     | Tareas     | Task list (priority-ordered)  |
| `/calendario` | Calendario | Exams and deadlines           |
| `/materias`   | Materias   | Subjects with notes/resources |
| `/documentos` | Documentos | File library (PDF/DOC)        |

### App shell (`__root` + header)

- Sticky header (`sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md`),
  max width `1440px`, height `16`.
- Brand: rounded primary square with `BookOpen` icon + wordmark "Estudia"
  (font-display, bold).
- Nav links: Inicio, Tareas, Calendario, Materias, Documentos — text with
  bottom-border active state (`border-primary text-primary`).
- Right cluster: search pill (rounded-full, muted bg), notification bell with
  urgent dot, user avatar + name/role (hidden on small screens), hamburger menu
  on mobile (5-column bottom nav grid with icons).
- Fonts: `Figtree` (sans) + `Outfit` (display).

### Dashboard (`/`) layout

Grid `lg:grid-cols-12` with three zones:

1. **Header row**: date eyebrow ("Martes, 22 de septiembre"), greeting
   ("Buenas tardes, Ana"), subtitle, and a right-side badge with weekly
   delivery count (`Atom` icon + "3 entregas esta semana").
2. **Tareas del día** (7 cols): card with icon tile (`Check`), title, pending
   counter, date chip ("22 SEP"). Each task row: outline checkbox button
   (toggles done → line-through + `bg-secondary/30`), title + detail, priority
   pill (Alta=rose / Media=amber / Baja=secondary), time with clock icon,
   kebab menu. Footer: "Añadir tarea" (primary outline) + "Ver todas →".
3. **Right column** (5 cols):
   - **Calendario**: month grid (7 columns, Lun–Dom headers, muted headers),
     prev/next month buttons, today circled with primary fill, event chips with
     tone classes (`bg-subject-blue`, `bg-subject-amber`, `bg-urgent`, etc.).
     Faded days for adjacent months. Link "Ver calendario completo →".
   - **Próximos vencimientos**: urgent-tinted header band ("Esta semana"),
     deadline rows with colored icon tiles, "Urgente" badge for urgent items.
4. **Materias favoritas** (full width, 4-col grid on xl): pinned subject cards
   with colored background tone, icon tile, name, subtitle, stats line
   ("12 apuntes · 5 recursos"), hover lift (`-translate-y-0.5 hover:shadow-md`),
   link to `/materias`.

### Detail pages (Tareas / Calendario / Materias / Documentos)

Simple consistent template:

- Back link: "Volver al inicio" (`ArrowLeft`).
- Eyebrow `text-primary` uppercase ("Estudia"), `font-display` H1 (4xl bold),
  muted description.
- Content: bordered cards (`rounded-lg border bg-card p-4/5`), icon +
  label/description rows.
- Materias page: 2-col grid of subject cards (icon tile `BookOpen` + name).

### Design tokens (styles.css)

- Light theme: green-tinted neutrals, `--primary: oklch(0.61 0.145 157)`,
  white cards, radius `0.5rem`.
- Dark theme: blue-tinted (`oklch(0.129 0.042 264.695)` background), full
  semantic token set including sidebar tokens.
- Semantic extras: `--urgent` (red), `--subject-blue/rose/amber/violet`
  pastel tints used for subjects, events and priority chips.
- Entrance animation `dashboard-entrance` (fade + translateY, cubic-bezier),
  disabled under `prefers-reduced-motion`.

## Reference 2 — Studyboard STO (subjects / study pages format)

Source: https://studyboard-sto.vercel.app (static multi-page site, "STO ·
Estudio — UTN FRLP 2026").

This is the **format expected for the Materias section**: each subject is a
complete study mini-site with roadmap, topics, study tools and solved exams.

### Home ("Tablero de estudio")

- Hero: "Elegí tu materia" — each subject has its own world: roadmap, teoría
  sintética, flashcards y parciales resueltos.
- **Section 01 Materias**: subjects grouped by cursada year
  (`4° Cuarto año`, `5° Quinto año`). Each subject card shows:
  - Name
  - Meta line ("UTN FRLP · 2026", "N temas · M tracks/fases · parciales 2024–2025")
  - Short description (1–2 lines)
  - "Entrar a la materia →" link
- **Section 02 Cómo funciona**: explains per-subject structure (roadmap,
  temas index, concept pages, estudio zone, solved parciales) and that reading
  progress is saved per subject; subject and accent color are remembered.
- Theme toggle (`☾`), per-subject accent color.

### Per-subject mini-site (e.g. `/simulacion/`)

- Nav: brand "STO · SIMULACIÓN", links **Inicio · Temas · Estudio ·
  Parciales**, theme toggle.
- Progress bar at top (reading progress, saved per subject).
- **Hero**: eyebrow (materia-specific), huge display title, rule, body text,
  tag pills (keywords).
- **Roadmap de la materia**: phases connected by a vertical accent line; each
  phase has number + name + hint; phase contains topic cards (`01`, name,
  tag line) that open concept pages with teoría sintética, diagrams and exam
  points.
- **Entries row**: Temas (índice completo), Estudio (flashcards, síntesis,
  multiple choice), Parciales (resueltos con clave).
- **Closing section**: "Cómo estudiar esta materia" — prose guidance.
- Fonts: Epilogue (display) + Spectral (serif) + JetBrains Mono; light/dark
  theme; per-subject accent.

## How these map to the planned product

| Planned feature                           | Reference                                    |
| ----------------------------------------- | -------------------------------------------- |
| App shell + navigation                    | Reference 1 (Estudia header, routes)         |
| Quick tasks (boolean done/not-done)       | Reference 1 (Tareas del día)                 |
| Calendar objectives (exams, deadlines)    | Reference 1 (Calendario + vencimientos)      |
| Document library (PDF/DOC)                | Reference 1 (Documentos)                     |
| Study pages: subject → topic → main ideas | Reference 2 (mini-site per subject)          |
| Subject/topic completion progress         | Reference 2 (progress bar + per-topic check) |
| Subject grouping by year, subject cards   | Reference 2 (Tablero de estudio)             |

Implementation stack in this repo is **SvelteKit** (not React/TanStack). Use
these references for visual structure, information architecture and UX
patterns; port the components to Svelte/SvelteKit equivalents.
