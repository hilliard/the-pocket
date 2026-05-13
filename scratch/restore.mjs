import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    // Find Joe User
    const res = await pool.query(`
      SELECT h.id, a.slug 
      FROM humans h 
      JOIN artists a ON h.id = a.human_id 
      WHERE a.slug LIKE '%joe%' OR h.first_name = 'Joe'
      LIMIT 1
    `);
    
    if (res.rows.length === 0) {
      console.log('Could not find Joe User.');
      process.exit(1);
    }

    const humanId = res.rows[0].id;
    console.log(`Found Joe User (human_id: ${humanId})`);

    // Insert the album
    await pool.query(`
      INSERT INTO albums (id, artist_human_id, title, price_cents, genre, album_type, cover_url)
      VALUES (gen_random_uuid(), $1, 'My First Album', 1499, 'Funk', 'album', '/media_assets/artists/1b47187c-JoeUser/products/photos/low_res/1778618758810_John-User-My-First-Album-2048x2048.png')
    `, [humanId]);

    console.log('Successfully restored "My First Album" to the database!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
