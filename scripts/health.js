import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Determine environment
const envFile = process.argv[2] === 'remote' ? '.env.production' : '.env';
const envPath = path.join(__dirname, '..', envFile);

// 2. Load env variables manually
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
  ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000 // 5 second timeout for health check
});

async function checkHealth() {
  try {
    const start = Date.now();
    const res = await pool.query('SELECT NOW() as time, version() as version');
    const duration = Date.now() - start;
    
    const host = pool.options.host || dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
    
    console.log('✅ Database is Healthy!');
    console.log(`📍 Host: ${host} (${envFile})`);
    console.log(`⏱️ Latency: ${duration}ms`);
    console.log(`🐘 Version: ${res.rows[0].version.split(',')[0]}`);
    console.log(`🕒 Server Time: ${res.rows[0].time}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Health Check Failed!');
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkHealth();
