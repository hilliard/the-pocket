import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres_sql@localhost:5432/the_pocket'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT c.human_id, c.username, r.role_name 
      FROM customers c
      LEFT JOIN human_site_roles hsr ON c.human_id = hsr.human_id
      LEFT JOIN site_roles r ON hsr.site_role_id = r.id
      WHERE c.username = 'sonny'
    `);
    console.log('Sonny roles:', res.rows);
    
    if (res.rows.length > 0) {
      const humanId = res.rows[0].human_id;
      const artistRes = await pool.query('SELECT * FROM artists WHERE human_id = $1', [humanId]);
      console.log('Sonny artist profile:', artistRes.rows);
      
      const roles = res.rows.map(r => r.role_name);
      if (!roles.includes('artist')) {
        console.log("Sonny doesn't have artist role! Adding it...");
        const artistRoleRes = await pool.query("SELECT id FROM site_roles WHERE role_name = 'artist'");
        if (artistRoleRes.rows.length > 0) {
          const roleId = artistRoleRes.rows[0].id;
          await pool.query('INSERT INTO human_site_roles (human_id, site_role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [humanId, roleId]);
          console.log('Granted artist role to Sonny!');
        }
      }
      
      if (artistRes.rows.length === 0) {
        console.log("Sonny doesn't have an artist profile! Creating one...");
        await pool.query(`
          INSERT INTO artists (human_id, slug, stage_name, accent_color_hex)
          VALUES ($1, 'sonny-hilliard', 'Sonny Hilliard', '#f59e0b')
        `, [humanId]);
        console.log('Created artist profile for Sonny!');
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
