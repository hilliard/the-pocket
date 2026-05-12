import { query } from '../server/db';

export interface Album {
  id: string;
  artist_human_id: string;
  title: string;
  price_cents: number;
  genre: string;
  cover_url: string | null;
}

export async function getAlbumsByArtist(artistHumanId: string): Promise<Album[]> {
  try {
    const result = await query(
      `SELECT id, artist_human_id, title, price_cents, genre, cover_url 
       FROM albums 
       WHERE artist_human_id = $1 
       ORDER BY created_at DESC;`,
      [artistHumanId]
    );

    return result.rows as Album[];
  } catch (error) {
    console.error(`Error fetching albums for artist human_id '${artistHumanId}':`, error);
    return [];
  }
}
