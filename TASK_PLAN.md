# "The Pocket" - Task Plan

## Mission
Build a deterministic, self-healing multi-tenant musician e-commerce platform using the BLAST master system framework.

## Technology Stack
- **Framework:** Astro (Server-rendered pages)
- **Database:** Postgres
- **Interactivity:** Hotwire (Turbo Streams + Stimulus)
- **Styling:** Tailwind CSS 4 (Mono Document design system, dark mode)
- **Services:** Resend (Email), Stripe (Billing)
- **Language:** TypeScript 7.0 (Beta) & Lexxy

## Phases & Goals

### Phase 1: Initialization & Planning (Protocol 0)
- [x] Create a Task Plan (phases, goals, and checklists)
- [x] Create a Progress Tracker
- [x] Initialize `gemini.mmd` project constitution

### Phase 2: Foundation & Infrastructure
- [x] Initialize Astro project following the defined folder structure (`/clients`, `/server`).
- [x] Configure Tailwind CSS 4 integration and Mono Document design system.
- [x] Setup Hotwire (Turbo Streams & Stimulus).
- [x] Connect Postgres database (manage connection via MCP servers if needed).

### Phase 3: Architecture & Logic Layer
- [x] Write technical SOPs defining goals, inputs, and edge cases.
- [x] Establish navigation/reasoning layer.
- [x] Create deterministic scripts and securely store environment variables.

### Phase 4: Stylize (Dynamic Tailwind Integration)
- [x] Set up server-side Astro logic to fetch artist's `accent_color_hex` from Postgres.
- [x] Implement CSS Custom Property Injection into the DOM (`--color-accent`).
- [x] Configure Tailwind 4 to map utility classes to `--color-accent` (e.g., `bg-accent`, `text-accent`).
- [x] Develop an 'Album Card' UI component featuring strict dark monochrome background and dynamic accent color for buttons and genre tags.
- [x] Add Hotwire-powered 'Add to Cart' button logic.

### Phase 5: Additional Features & Services
- [x] Integrate Stripe billing flows.
- [x] Integrate Resend for transaction/newsletter emails.
