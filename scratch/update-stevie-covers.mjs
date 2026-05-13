import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    await pool.query(`
      UPDATE albums 
      SET cover_url = '/SitKoL_album_cover.jpg' 
      WHERE title ILIKE '%Songs in the Key%'
    `);
    await pool.query(`
      UPDATE albums 
      SET cover_url = '/htj_album_cover.jpg' 
      WHERE title ILIKE '%Hotter Than July%'
    `);
    
    console.log('Successfully updated Stevie album covers to use absolute paths!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
