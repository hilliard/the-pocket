import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    const updateAlbums = await pool.query(`
      UPDATE albums 
      SET cover_url = '/' || cover_url 
      WHERE cover_url IS NOT NULL 
      AND cover_url NOT LIKE '/%' 
      AND cover_url NOT LIKE 'http%'
    `);
    console.log(`Fixed ${updateAlbums.rowCount} albums`);

    const updateMerch = await pool.query(`
      UPDATE merch 
      SET image_url = '/' || image_url 
      WHERE image_url IS NOT NULL 
      AND image_url NOT LIKE '/%' 
      AND image_url NOT LIKE 'http%'
    `);
    console.log(`Fixed ${updateMerch.rowCount} merch items`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
