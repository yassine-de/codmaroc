-- Add Wakilni integration fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS wakilni_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS wakilni_status INTEGER,
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_wakilni_id ON orders(wakilni_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);

-- Add comment to describe the wakilni_status field
COMMENT ON COLUMN orders.wakilni_status IS 'Wakilni status codes:
1 = PENDING
2 = CONFIRMED
3 = PROCESSING
4 = SUCCESS
5 = FAILED
6 = DECLINED
7 = CANCELED
8 = CLOSED_FAILED
9 = POSTPONED
10 = PENDING_CANCELLATION'; 