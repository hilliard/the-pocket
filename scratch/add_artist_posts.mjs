import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS artist_posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          artist_human_id UUID NOT NULL REFERENCES artists(human_id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          media_url VARCHAR(1024),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_artist_posts_human_id ON artist_posts(artist_human_id);
    `);
    console.log("Created artist_posts table!");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
