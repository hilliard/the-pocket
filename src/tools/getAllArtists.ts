import { query } from '../server/db';
import type { Artist } from './getArtistBySlug';

export async function getAllArtists(): Promise<Artist[]> {
  try {
    const result = await query(
      `SELECT human_id as id, slug, stage_name as name, accent_color_hex FROM artists ORDER BY created_at DESC;`
    );

    return result.rows as Artist[];
  } catch (error) {
    console.error(`Error fetching all artists:`, error);
    return [];
  }
}
