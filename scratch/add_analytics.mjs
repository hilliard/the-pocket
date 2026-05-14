import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          artist_human_id UUID NOT NULL REFERENCES artists(human_id) ON DELETE CASCADE,
          event_type VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50),
          entity_id UUID,
          visitor_id VARCHAR(255),
          referrer VARCHAR(1024),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_artist ON analytics_events(artist_human_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
    `);
    console.log("Created analytics_events table!");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
