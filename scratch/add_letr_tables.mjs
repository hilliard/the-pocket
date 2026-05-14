import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          artist_human_id UUID NOT NULL REFERENCES artists(human_id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'subscribed',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(artist_human_id, email)
      );
      CREATE INDEX IF NOT EXISTS idx_subscribers_artist ON subscribers(artist_human_id);

      CREATE TABLE IF NOT EXISTS campaigns (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          artist_human_id UUID NOT NULL REFERENCES artists(human_id) ON DELETE CASCADE,
          subject VARCHAR(255) NOT NULL,
          body_html TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'draft',
          sent_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_campaigns_artist ON campaigns(artist_human_id);
    `);
    console.log("Created subscribers and campaigns tables!");

    // Add a fake subscriber for Joe User for testing
    const result = await pool.query(`SELECT human_id FROM artists WHERE slug = 'joe-user'`);
    if (result.rows.length > 0) {
      const joeUserId = result.rows[0].human_id;
      await pool.query(`
        INSERT INTO subscribers (artist_human_id, email) 
        VALUES ($1, 'superfan@example.com') 
        ON CONFLICT DO NOTHING
      `, [joeUserId]);
      console.log("Added test subscriber: superfan@example.com");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
