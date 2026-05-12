# SOP: Dynamic Artist Styling

## Goal
To fetch and inject an artist's specific `accent_color_hex` dynamically so that Tailwind CSS 4 maps the `--color-accent` property seamlessly across the storefront.

## Inputs
1. **URL Parameter**: `slug` (the artist's unique identifier).
2. **Database Record**: Matches `slug` to the `artists` table in Postgres to fetch `accent_color_hex`.

## Execution Logic (The "Happy Path")
1. Request arrives at `/clients/artists/[slug]/public`.
2. Astro server-side code parses `slug`.
3. Database `query` is fired: `SELECT accent_color_hex FROM artists WHERE slug = $1 LIMIT 1;`.
4. Extracted hex is stored in an Astro variable (`const accentColor = row.accent_color_hex;`).
5. Render the Astro Layout with a `<style>` injection mapping `--color-accent-dynamic: {accentColor}`.
6. Tailwind CSS uses `--color-accent` seamlessly on buttons, borders, and tags.

## Edge Cases & Error Handling
- **Database Unreachable or Query Error**: Log error, fallback to default hex (`#3b82f6`).
- **Artist Slug Not Found**: Throw a 404 response or redirect to a generic "Artist Not Found" page.
- **Hex Value Invalid**: If the returned string from the DB is not a valid hex, the browser fallback handles it, but the database constraint should ideally prevent invalid data.
