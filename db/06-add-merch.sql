CREATE TABLE IF NOT EXISTS merch (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_human_id UUID REFERENCES artists(human_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    inventory_count INTEGER DEFAULT 0,
    requires_shipping BOOLEAN DEFAULT true,
    image_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
