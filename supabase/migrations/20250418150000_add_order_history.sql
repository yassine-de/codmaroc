/*
  # Add order history tracking

  1. New Tables
    - `order_history`
      - `id` (serial, primary key)
      - `order_id` (integer, references orders)
      - `old_status` (integer)
      - `new_status` (integer)
      - `changed_by` (integer, references users)
      - `changed_at` (timestamptz)
      - `notes` (text)
      - `sheet_order_id` (text)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create order_history table
CREATE TABLE IF NOT EXISTS order_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  old_status INTEGER,
  new_status INTEGER,
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  sheet_order_id TEXT
);

-- Enable RLS
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_history' 
    AND policyname = 'Users can view order history'
  ) THEN
    CREATE POLICY "Users can view order history"
      ON order_history
      FOR SELECT
      TO authenticated
      USING (
        order_id IN (
          SELECT id FROM orders WHERE user_id IN (
            SELECT id FROM users WHERE auth_id = auth.uid()
          )
        )
        OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE auth_id = auth.uid() 
          AND role = 1
        )
      );
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_changed_at ON order_history(changed_at);

-- Create function to get status name
CREATE OR REPLACE FUNCTION get_status_name(status_id INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE status_id
    WHEN 1 THEN 'NEW'
    WHEN 2 THEN 'CONFIRMED'
    WHEN 3 THEN 'DELIVERED'
    WHEN 4 THEN 'CANCELLED'
    WHEN 5 THEN 'NO REPLY 1'
    WHEN 6 THEN 'NO REPLY 2'
    WHEN 7 THEN 'NO REPLY 3'
    WHEN 8 THEN 'NO REPLY 4'
    WHEN 9 THEN 'NO REPLY 5'
    WHEN 10 THEN 'NO REPLY 6'
    WHEN 11 THEN 'NO REPLY 7'
    WHEN 12 THEN 'NO REPLY 8'
    WHEN 13 THEN 'NO REPLY 9'
    WHEN 14 THEN 'REPORTED'
    WHEN 15 THEN 'DOUBLE'
    WHEN 16 THEN 'WRONG NUMBER'
    WHEN 17 THEN 'SHIPPED'
    WHEN 18 THEN 'PAID'
    ELSE 'UNKNOWN'
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically track status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO order_history (
      order_id,
      old_status,
      new_status,
      changed_by,
      notes,
      sheet_order_id
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      (SELECT id FROM users WHERE auth_id = auth.uid()),
      'Status changed from ' || get_status_name(OLD.status) || ' to ' || get_status_name(NEW.status),
      NEW.sheet_order_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'track_order_status_change_trigger'
  ) THEN
    CREATE TRIGGER track_order_status_change_trigger
      AFTER UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION track_order_status_change();
  END IF;
END $$; 