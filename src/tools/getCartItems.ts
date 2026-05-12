import { query } from '../server/db';

export interface CartItem {
  id: string;
  type: string;
  title: string;
  price_cents: number;
  cover_url: string | null;
  artist_name: string;
}

export async function getCartItems(cartInputs: { id: string; type: string }[]): Promise<CartItem[]> {
  if (!cartInputs || cartInputs.length === 0) return [];

  const items: CartItem[] = [];

  for (const item of cartInputs) {
    if (item.type === 'album') {
      const result = await query(
        `SELECT a.title, a.price_cents, a.cover_url, art.stage_name 
         FROM albums a 
         JOIN artists art ON a.artist_human_id = art.human_id 
         WHERE a.id = $1 LIMIT 1;`,
        [item.id]
      );
      if (result.rows.length > 0) {
        items.push({
          id: item.id,
          type: item.type,
          title: result.rows[0].title,
          price_cents: result.rows[0].price_cents,
          cover_url: result.rows[0].cover_url,
          artist_name: result.rows[0].stage_name
        });
      }
    } else if (item.type === 'song') {
      // For songs, we might also want to fetch the cover URL of an album it belongs to, 
      // but for simplicity, we'll fetch its title and price.
      const result = await query(
        `SELECT s.title, s.individual_price_cents, art.stage_name,
           (SELECT a.cover_url FROM album_songs br JOIN albums a ON br.album_id = a.id WHERE br.song_id = s.id LIMIT 1) as cover_url
         FROM songs s 
         JOIN artists art ON s.artist_human_id = art.human_id 
         WHERE s.id = $1 LIMIT 1;`,
        [item.id]
      );
      if (result.rows.length > 0) {
        items.push({
          id: item.id,
          type: item.type,
          title: result.rows[0].title,
          price_cents: result.rows[0].individual_price_cents,
          cover_url: result.rows[0].cover_url,
          artist_name: result.rows[0].stage_name
        });
      }
    } else if (item.type === 'merch') {
      const result = await query(
        `SELECT m.title, m.price_cents, m.image_url, art.stage_name 
         FROM merch m 
         JOIN artists art ON m.artist_human_id = art.human_id 
         WHERE m.id = $1 LIMIT 1;`,
        [item.id]
      );
      if (result.rows.length > 0) {
        items.push({
          id: item.id,
          type: item.type,
          title: result.rows[0].title,
          price_cents: result.rows[0].price_cents,
          cover_url: result.rows[0].image_url,
          artist_name: result.rows[0].stage_name
        });
      }
    }
  }

  return items;
}
