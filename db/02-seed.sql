-- 02-seed.sql
-- Human-Centric Seed Data

-- 1. Create Core Site Roles
INSERT INTO site_roles (id, role_name, description) VALUES
('00000000-0000-0000-0001-000000000001', 'admin', 'System administrator'),
('00000000-0000-0000-0001-000000000002', 'artist', 'Musical artist selling products'),
('00000000-0000-0000-0001-000000000003', 'customer', 'Buyer of products')
ON CONFLICT (role_name) DO NOTHING;

-- 2. Create Stevie Wonder (The Human)
INSERT INTO humans (id, first_name, last_name, gender)
VALUES ('00000000-0000-0000-0002-000000000001', 'Stevland', 'Morris', 'Male')
ON CONFLICT (id) DO NOTHING;

-- Create Stevie Wonder (The Artist extension)
INSERT INTO artists (human_id, slug, stage_name, accent_color_hex)
VALUES ('00000000-0000-0000-0002-000000000001', 'stevie-wonder', 'Stevie Wonder', '#f59e0b')
ON CONFLICT (human_id) DO NOTHING;

-- Grant Stevie the Artist Role
INSERT INTO human_site_roles (human_id, site_role_id)
VALUES ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000002')
ON CONFLICT DO NOTHING;

-- Set Stevie's Email History
INSERT INTO email_history (human_id, email)
VALUES ('00000000-0000-0000-0002-000000000001', 'stevie@example.com');

-- 3. Create Earth, Wind & Fire (The Human - representing the band entity)
INSERT INTO humans (id, first_name, last_name, gender)
VALUES ('00000000-0000-0000-0002-000000000002', 'Maurice', 'White', 'Male')
ON CONFLICT (id) DO NOTHING;

-- Create EWF (The Artist extension)
INSERT INTO artists (human_id, slug, stage_name, accent_color_hex)
VALUES ('00000000-0000-0000-0002-000000000002', 'ewf', 'Earth, Wind & Fire', '#ef4444')
ON CONFLICT (human_id) DO NOTHING;

-- Grant EWF the Artist Role
INSERT INTO human_site_roles (human_id, site_role_id)
VALUES ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000002')
ON CONFLICT DO NOTHING;

-- 4. Create Albums for Stevie
INSERT INTO albums (id, artist_human_id, title, price_cents, genre)
VALUES 
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001', 'Hotter Than July', 1499, 'R&B/Soul'),
('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000001', 'Songs In The Key Of Life', 2499, 'Soul')
ON CONFLICT (id) DO NOTHING;

-- 5. Create Independent Songs for Stevie
INSERT INTO songs (id, artist_human_id, title, duration_seconds, individual_price_cents)
VALUES
('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000001', 'Master Blaster (Jammin)', 307, 129),
('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000001', 'All I Do', 306, 99)
ON CONFLICT (id) DO NOTHING;

-- 6. Bridge the Songs to the 'Hotter Than July' Album
INSERT INTO album_songs (album_id, song_id, track_number)
VALUES
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0004-000000000001', 1),
('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0004-000000000002', 2)
ON CONFLICT DO NOTHING;

-- 7. Track the Media Files for these Songs
INSERT INTO media_files (entity_type, entity_id, file_path, file_format, mime_type)
VALUES
('song', '00000000-0000-0000-0004-000000000001', '/artists/19-StevieWonder/products/music/masters/Hotter Than July/01-master-blaster.mp3', 'mp3', 'audio/mpeg'),
('song', '00000000-0000-0000-0004-000000000002', '/artists/19-StevieWonder/products/music/masters/Hotter Than July/02-all-i-do.mp3', 'mp3', 'audio/mpeg')
ON CONFLICT DO NOTHING;
