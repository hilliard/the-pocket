-- 01-schema.sql
-- Human-Centric Postgres Schema for The Pocket

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Base Entity
CREATE TABLE IF NOT EXISTS humans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dob DATE,
    gender VARCHAR(50),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Extensions ("Be" something)
CREATE TABLE customers (
    human_id UUID PRIMARY KEY REFERENCES humans(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE artists (
    human_id UUID PRIMARY KEY REFERENCES humans(id) ON DELETE CASCADE,
    slug VARCHAR(255) UNIQUE NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    accent_color_hex VARCHAR(7) DEFAULT '#3b82f6',
    bio TEXT,
    website VARCHAR(255),
    google_refresh_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attributes ("Have" something)
CREATE TABLE email_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    human_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    change_reason VARCHAR(100) DEFAULT 'initial',
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP WITH TIME ZONE,
    CONSTRAINT email_history_email_key UNIQUE (email, effective_to) -- Prevent active duplicates
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE addressable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'human', 'company'
    entity_id UUID NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP WITH TIME ZONE
);

-- Roles & Permissions
CREATE TABLE site_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100),
    action VARCHAR(50)
);

CREATE TABLE human_site_roles (
    human_id UUID REFERENCES humans(id) ON DELETE CASCADE,
    site_role_id UUID REFERENCES site_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (human_id, site_role_id)
);

CREATE TABLE site_role_permissions (
    site_role_id UUID REFERENCES site_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (site_role_id, permission_id)
);

-- Business Domain specific tables
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_human_id UUID REFERENCES artists(human_id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage INTEGER,
    discount_cents INTEGER,
    max_uses INTEGER,
    times_used INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_human_id UUID REFERENCES customers(human_id) ON DELETE SET NULL,
    artist_human_id UUID REFERENCES artists(human_id), -- The artist being paid
    stripe_session_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    customer_email VARCHAR(255) NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    discount_cents INTEGER DEFAULT 0,
    loyalty_points_used INTEGER DEFAULT 0,
    loyalty_points_earned INTEGER DEFAULT 0,
    coupon_id UUID REFERENCES coupons(id),
    total_cents INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'song', 'album', 'merch'
    entity_id UUID NOT NULL,
    price_cents INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_human_id UUID REFERENCES artists(human_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    album_type VARCHAR(50) DEFAULT 'album', -- 'album', 'ep'
    price_cents INTEGER NOT NULL,
    genre VARCHAR(100),
    cover_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_human_id UUID REFERENCES artists(human_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    isrc VARCHAR(100) UNIQUE,
    duration_seconds INTEGER,
    bpm INTEGER,
    is_explicit BOOLEAN DEFAULT false,
    genre VARCHAR(100),
    individual_price_cents INTEGER DEFAULT 99,
    master_audio_path VARCHAR(1024),
    preview_audio_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE album_songs (
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    track_number INTEGER NOT NULL,
    disc_number INTEGER DEFAULT 1,
    PRIMARY KEY (album_id, song_id)
);

CREATE TABLE merch (
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

CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'song', 'album_cover', 'profile_photo'
    entity_id UUID NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    file_format VARCHAR(50),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(entity_type, entity_id, file_path)
);



CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    human_id UUID REFERENCES humans(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    message_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'dispatched',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Status Enum
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'pending', 'trialing', 'paused');

-- Subscriptions Lifecycle Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_human_id UUID NOT NULL REFERENCES humans(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    plan_id VARCHAR(100),
    status subscription_status NOT NULL DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    subscribe_after_trial BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Active Subscriptions View
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT * FROM subscriptions 
WHERE status = 'active' AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP);

-- Partial Index for Performance
CREATE INDEX idx_active_subscriptions ON subscriptions(customer_human_id) WHERE status = 'active';

-- Artist Posts (Social Feed)
CREATE TABLE IF NOT EXISTS artist_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_human_id UUID NOT NULL REFERENCES artists(human_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_artist_posts_human_id ON artist_posts(artist_human_id);

-- Artist Events (Tour Dates)
CREATE TABLE IF NOT EXISTS artist_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_human_id UUID NOT NULL REFERENCES artists(human_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255),
    location VARCHAR(255),
    ticket_url VARCHAR(1024),
    google_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_artist_events_human_id ON artist_events(artist_human_id);
