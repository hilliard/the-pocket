import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket' });

async function run() {
  const username = 'sonny';
  const email = 'hilliards@gmail.com';
  const password = 'Sonny@123';
  const hash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create human
    const humanRes = await client.query(`
      INSERT INTO humans (first_name, last_name) 
      VALUES ('Sonny', 'Hilliard') 
      RETURNING id
    `);
    const humanId = humanRes.rows[0].id;

    // 2. Add email
    await client.query(`
      INSERT INTO email_history (human_id, email) 
      VALUES ($1, $2)
    `, [humanId, email]);

    // 3. Add customer/credentials
    await client.query(`
      INSERT INTO customers (human_id, username, password_hash) 
      VALUES ($1, $2, $3)
    `, [humanId, username, hash]);

    // 4. Assign Admin Role ('00000000-0000-0000-0001-000000000001' from seed)
    await client.query(`
      INSERT INTO human_site_roles (human_id, site_role_id) 
      VALUES ($1, '00000000-0000-0000-0001-000000000001')
    `, [humanId]);

    await client.query('COMMIT');
    console.log('Admin user sonny created successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
