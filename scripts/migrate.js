import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Determine environment
const envFile = process.argv[2] === 'remote' ? '.env.production' : '.env';
const envPath = path.join(__dirname, '..', envFile);

// 2. Load env variables manually (zero-dependency approach)
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const varName = key.trim();
      if (varName && !process.env[varName]) {
        process.env[varName] = valueParts.join('=').trim().replace(/(^"|"$|^'|'$)/g, '');
      }
    }
  }
} catch (e) {
  console.log(`⚠️  Could not load ${envFile} file. Relying on existing process.env variables.`);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(`❌ ERROR: DATABASE_URL environment variable is missing (checked ${envFile}).`);
  process.exit(1);
}

// 3. Connect to Postgres
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    const host = pool.options.host || dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
    console.log(`🔌 Connected to database at [${host}]`);
    
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const dbDir = path.join(__dirname, '../db');
    const files = await fsp.readdir(dbDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    if (sqlFiles.length === 0) {
      console.log('📂 No .sql files found in db/ directory.');
      return;
    }

    // Get already applied migrations
    const { rows } = await client.query('SELECT filename FROM _migrations');
    const applied = new Set(rows.map(r => r.filename));

    let count = 0;
    for (const file of sqlFiles) {
      if (applied.has(file)) {
        console.log(`⏩ Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`⏳ Applying ${file}...`);
      const filePath = path.join(dbDir, file);
      const sql = await fsp.readFile(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Successfully applied ${file}`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error applying ${file}:`, err.message);
        throw err;
      }
    }

    if (count === 0) {
      console.log('✨ Database is already up to date!');
    } else {
      console.log(`🎉 Successfully applied ${count} new migration(s).`);
    }

  } catch (err) {
    console.error('💥 Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
