-- 1. Create the new ENUM for subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'pending', 'trialing', 'paused');

-- 2. Create the subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_human_id UUID NOT NULL REFERENCES customers(human_id) ON DELETE CASCADE,
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

-- 3. Create a partial index for active subscriptions
CREATE INDEX idx_active_subscriptions ON subscriptions(customer_human_id) 
WHERE status = 'active';

-- 4. Create a view to mask the complexity of checking active status
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT * FROM subscriptions 
WHERE status = 'active' AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP);

-- 5. Drop the old boolean from humans
ALTER TABLE humans DROP COLUMN IF EXISTS is_active;
