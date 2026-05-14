import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    // Drop the foreign key constraint if customers table doesn't exist, change to humans
    // But first let's just add the column
    await pool.query(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE;
    `);
    console.log("Added stripe_subscription_id to subscriptions table");

    // Let's also check if the foreign key to customers is actually valid or if it needs to point to humans
    try {
      await pool.query(`
        ALTER TABLE subscriptions 
        DROP CONSTRAINT IF EXISTS subscriptions_customer_human_id_fkey;

        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_customer_human_id_fkey 
        FOREIGN KEY (customer_human_id) REFERENCES humans(id) ON DELETE CASCADE;
      `);
      console.log("Fixed foreign key constraint for subscriptions");
    } catch (e) {
      console.log("FK constraint fix failed (might already be fine or humans table missing)", e.message);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
