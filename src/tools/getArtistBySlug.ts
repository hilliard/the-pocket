import { query } from '../server/db';

export interface Artist {
  id: string;
  slug: string;
  name: string;
  accent_color_hex: string;
}

/**
 * Deterministically fetches an artist by slug from the database.
 * Fallback to default hex if not found or on error (as per SOP).
 */
export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  try {
    const result = await query(
      `SELECT human_id as id, slug, stage_name as name, accent_color_hex FROM artists WHERE slug = $1 LIMIT 1;`,
      [slug]
    );

    if (result.rows.length === 0) {
      console.log(`[DB] No artist found for slug: ${slug}`);
      return null;
    }

    console.log(`[DB] Successfully fetched artist: ${result.rows[0].name} with color ${result.rows[0].accent_color_hex}`);
    return result.rows[0] as Artist;
  } catch (error) {
    console.error(`Error fetching artist by slug '${slug}':`, error);
    // Let the calling layer handle the null/fallback state
    return null;
  }
}
