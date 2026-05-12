-- Insert Lucy Smith
INSERT INTO humans (id, first_name, last_name) 
VALUES ('00000000-0000-0000-0002-000000000099', 'Lucy', 'Smith')
ON CONFLICT DO NOTHING;

-- Insert lucy77 customer record
INSERT INTO customers (human_id, username, password_hash) 
VALUES ('00000000-0000-0000-0002-000000000099', 'lucy77', '$2b$10$abcdefghijklmnopqrstuv')
ON CONFLICT DO NOTHING;

-- Assign 'admin' role
INSERT INTO human_site_roles (human_id, site_role_id) 
VALUES ('00000000-0000-0000-0002-000000000099', '00000000-0000-0000-0001-000000000001')
ON CONFLICT DO NOTHING;
