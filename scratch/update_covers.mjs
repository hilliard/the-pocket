import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket' });

async function run() {
  await pool.query(`
    UPDATE albums 
    SET cover_url = 'https://placehold.co/800x800/f59e0b/ffffff?text=Hotter+Than+July'
    WHERE title = 'Hotter Than July';
  `);
  
  await pool.query(`
    UPDATE albums 
    SET cover_url = 'https://placehold.co/800x800/f59e0b/ffffff?text=Songs+In+The+Key+Of+Life'
    WHERE title = 'Songs In The Key Of Life';
  `);

  console.log('Covers updated!');
  process.exit(0);
}

run();
