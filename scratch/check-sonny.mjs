import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT h.id, h.username, r.role_name 
      FROM humans h
      LEFT JOIN human_roles hr ON h.id = hr.human_id
      LEFT JOIN roles r ON hr.role_id = r.id
      WHERE h.username = 'sonny'
    `);
    
    console.log('Sonny roles:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
