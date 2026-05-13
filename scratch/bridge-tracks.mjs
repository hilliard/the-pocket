import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    const albumRes = await pool.query(`
      SELECT a.id 
      FROM albums a
      JOIN artists art ON a.artist_human_id = art.human_id
      WHERE art.slug LIKE '%joe%' AND a.title = 'My First Album'
      LIMIT 1
    `);

    if (albumRes.rows.length === 0) {
      console.log('Album not found');
      process.exit(1);
    }
    const albumId = albumRes.rows[0].id;

    const songsRes = await pool.query(`
      SELECT s.id, s.title
      FROM songs s
      JOIN artists a ON s.artist_human_id = a.human_id
      WHERE a.slug LIKE '%joe%' AND s.title LIKE 'Track_%'
      ORDER BY s.title ASC
    `);

    let trackNumber = 1;
    for (const song of songsRes.rows) {
      await pool.query(`
        INSERT INTO album_songs (album_id, song_id, track_number)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [albumId, song.id, trackNumber]);
      trackNumber++;
    }

    console.log('Successfully re-linked tracks to the album!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
