# Reasoning Layer: Navigation Router

## Purpose
This document maps business actions to technical SOPs and deterministically points to the specific tools (scripts/functions) required for execution.

## Routing Map

### Action: Render Artist Storefront
- **Trigger**: User navigates to `/clients/artists/[slug]/public`
- **SOP**: [SOP_Dynamic_Styling.md](./SOP_Dynamic_Styling.md)
- **Tool/Execution**: 
  - `src/server/db.ts` (`getArtistBySlug(slug)`)
  - Astro page route (`src/pages/clients/artists/[slug]/public/index.astro`)

### Action: Cart Operations
- **Trigger**: User clicks "Add to Cart"
- **SOP**: *TBD - SOP_Cart_Operations.md*
- **Tool/Execution**: 
  - Hotwire Turbo Streams via `<turbo-frame>`
  - Stimulus controllers in `src/scripts/controllers/`

### Action: Checkout
- **Trigger**: User submits payment
- **SOP**: *TBD - SOP_Checkout_Stripe.md*
- **Tool/Execution**:
  - `stripe` npm library backend scripts.
