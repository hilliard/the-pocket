import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const artists = [
  {
    name: 'Stevie Wonder',
    humanId: '00000000-0000-0000-0002-000000000001',
    slug: 'stevie-wonder',
    albums: [
      {
        title: 'Songs In The Key Of Life',
        id: '00000000-0000-0000-0003-000000000002', // From 02-seed.sql
        sourceDir: 'D:\\public\\SharedMusic\\Stevie Wonder\\Songs In The Key Of Life'
      }
    ]
  },
  {
    name: 'Earth, Wind & Fire',
    humanId: '00000000-0000-0000-0002-000000000002',
    slug: 'ewf',
    albums: [
      {
        title: "That's The Way Of The World",
        id: randomUUID(), // Generate new album ID
        sourceDir: "D:\\public\\SharedMusic\\Earth, Wind & Fire\\That's The Way Of The World",
        priceCents: 1599,
        genre: 'R&B/Funk'
      }
    ]
  }
];

let sql = '';

for (const artist of artists) {
  for (const album of artist.albums) {
    if (album.priceCents) {
      // Need to insert album
      sql += `INSERT INTO albums (id, artist_human_id, title, price_cents, genre) VALUES ('${album.id}', '${artist.humanId}', '${album.title.replace(/'/g, "''")}', ${album.priceCents}, '${album.genre}') ON CONFLICT (id) DO NOTHING;\n`;
    }

    const destDir = path.join(process.cwd(), 'public', 'artists', artist.slug, 'products', 'music', 'masters', album.title);
    fs.mkdirSync(destDir, { recursive: true });

    let files;
    try {
      files = fs.readdirSync(album.sourceDir);
    } catch (e) {
      console.log(`-- Directory not found: ${album.sourceDir}`);
      continue;
    }

    let trackNum = 1;
    for (const file of files) {
      if (!file.toLowerCase().endsWith('.mp3')) continue;

      const songTitle = file.replace('.mp3', '').replace(/^\d+[\s-]+/, '').trim();
      const safeTitle = songTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const newFileName = `${trackNum.toString().padStart(2, '0')}-${safeTitle}.mp3`;
      
      const srcPath = path.join(album.sourceDir, file);
      const destPath = path.join(destDir, newFileName);
      
      // Copy file
      fs.copyFileSync(srcPath, destPath);

      const dbPath = `/artists/${artist.slug}/products/music/masters/${album.title}/${newFileName}`;
      const songId = randomUUID();

      sql += `
INSERT INTO songs (id, artist_human_id, title, duration_seconds, individual_price_cents) 
VALUES ('${songId}', '${artist.humanId}', '${songTitle.replace(/'/g, "''")}', 240, 129);

INSERT INTO album_songs (album_id, song_id, track_number)
VALUES ('${album.id}', '${songId}', ${trackNum});

INSERT INTO media_files (entity_type, entity_id, file_path, file_format, mime_type)
VALUES ('song', '${songId}', '${dbPath.replace(/'/g, "''")}', 'mp3', 'audio/mpeg');
`;
      trackNum++;
    }
  }
}

fs.writeFileSync('db/03-import.sql', sql);
console.log('Done! Run: psql -U postgres -d the_pocket -f db/03-import.sql');
