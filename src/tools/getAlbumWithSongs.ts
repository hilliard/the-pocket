import { query } from '../server/db';
import type { Album } from './getAlbumsByArtist';

export interface Song {
  id: string;
  title: string;
  duration_seconds: number;
  track_number: number;
  individual_price_cents: number;
  media_url?: string;
}

export interface AlbumWithSongs extends Album {
  songs: Song[];
}

export async function getAlbumWithSongs(albumId: string): Promise<AlbumWithSongs | null> {
  try {
    // 1. Fetch Album metadata
    const albumResult = await query(
      `SELECT id, artist_human_id, title, price_cents, genre, cover_url 
       FROM albums 
       WHERE id = $1 LIMIT 1;`,
      [albumId]
    );

    if (albumResult.rows.length === 0) {
      return null;
    }

    const album = albumResult.rows[0];

    // 2. Fetch Songs via 3NF Bridge Table (album_songs) and Media Files
    const songsResult = await query(
      `SELECT s.id, s.title, s.duration_seconds, s.individual_price_cents, bridge.track_number, mf.file_path as media_url
       FROM songs s
       JOIN album_songs bridge ON s.id = bridge.song_id
       LEFT JOIN media_files mf ON mf.entity_id = s.id AND mf.entity_type = 'song'
       WHERE bridge.album_id = $1
       ORDER BY bridge.disc_number ASC, bridge.track_number ASC;`,
      [albumId]
    );

    return {
      ...album,
      songs: songsResult.rows as Song[]
    };
  } catch (error) {
    console.error(`Error fetching album and songs for album_id '${albumId}':`, error);
    return null;
  }
}
