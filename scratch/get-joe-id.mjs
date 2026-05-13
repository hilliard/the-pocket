import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT *
      FROM artists
      WHERE slug LIKE '%joe%' OR stage_name LIKE '%Joe%'
    `);
    
    console.log('Joe User Details:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
