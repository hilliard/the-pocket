import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_domains (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          domain VARCHAR(255) UNIQUE NOT NULL,
          artist_human_id UUID NOT NULL REFERENCES artists(human_id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
    `);
    console.log("Created custom_domains table!");

    // Add a fake local domain for Joe User for testing
    const result = await pool.query(`SELECT human_id FROM artists WHERE slug = 'joe-user'`);
    if (result.rows.length > 0) {
      const joeUserId = result.rows[0].human_id;
      await pool.query(`
        INSERT INTO custom_domains (domain, artist_human_id) 
        VALUES ('joeuser.local', $1) 
        ON CONFLICT (domain) DO NOTHING
      `, [joeUserId]);
      console.log("Added test domain: joeuser.local");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
