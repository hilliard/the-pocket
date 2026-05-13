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

    // Delete mappings for the dummy tracks that don't have an underscore
    await pool.query(`
      DELETE FROM album_songs
      WHERE album_id = $1 AND song_id IN (
        SELECT id FROM songs WHERE title NOT LIKE '%\\_%' ESCAPE '\\'
      )
    `, [albumId]);

    console.log('Successfully cleaned up the overachieving duplicates!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
