import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    // We update both the slug and the stage_name to perfectly match
    const res = await pool.query(`
      UPDATE artists
      SET slug = 'hilliard-scott', stage_name = 'Hilliard Scott'
      WHERE slug = 'sonny-hilliard' OR stage_name = 'Sonny Hilliard'
      RETURNING *;
    `);
    
    console.log('Successfully updated artist record:');
    console.log(`New Stage Name: ${res.rows[0].stage_name}`);
    console.log(`New Slug (URL): ${res.rows[0].slug}`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
