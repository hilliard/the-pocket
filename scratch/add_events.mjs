import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS artist_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          artist_human_id UUID NOT NULL REFERENCES artists(human_id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          event_date TIMESTAMP WITH TIME ZONE NOT NULL,
          venue VARCHAR(255),
          location VARCHAR(255),
          ticket_url VARCHAR(1024),
          google_event_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_artist_events_human_id ON artist_events(artist_human_id);
      
      ALTER TABLE artists ADD COLUMN IF NOT EXISTS google_refresh_token VARCHAR(255);
    `);
    console.log("Created artist_events table and added google_refresh_token!");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
