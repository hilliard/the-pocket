import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT s.id, s.title, s.duration_seconds
      FROM songs s
      JOIN artists a ON s.artist_human_id = a.human_id
      WHERE a.slug LIKE '%joe%'
    `);
    
    console.log('Joe User Songs in DB:', res.rows);

    const albumRes = await pool.query(`
      SELECT a.id 
      FROM albums a
      JOIN artists art ON a.artist_human_id = art.human_id
      WHERE art.slug LIKE '%joe%' AND a.title = 'My First Album'
      LIMIT 1
    `);

    if (albumRes.rows.length > 0) {
      console.log('My First Album ID:', albumRes.rows[0].id);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
