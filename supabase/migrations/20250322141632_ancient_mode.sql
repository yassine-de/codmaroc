/*
  # Fix invoice schema migration

  1. Changes
    - Use IF NOT EXISTS for table creation
    - Use IF NOT EXISTS for indexes
    - Use DO $$ BEGIN/END $$ blocks for safe policy creation
    
  2. Security
    - Maintain same RLS policies
    - Keep all existing constraints and checks
*/

-- Create invoices table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    CREATE TABLE invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id integer REFERENCES users(id) NOT NULL,
      invoice_number text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT 'Unpaid',
      total_amount numeric(10,2) NOT NULL DEFAULT 0,
      shipping_fees numeric(10,2) NOT NULL DEFAULT 0,
      cod_fees numeric(10,2) NOT NULL DEFAULT 0,
      factorisation_fees jsonb DEFAULT '[]',
      payment_proof text,
      created_at timestamptz DEFAULT now(),
      paid_at timestamptz,
      CONSTRAINT status_check CHECK (status IN ('Paid', 'Unpaid'))
    );
  END IF;
END $$;

-- Add new columns to orders table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN invoice_id uuid REFERENCES invoices(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'crbt'
  ) THEN
    ALTER TABLE orders ADD COLUMN crbt numeric(10,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'paid'
  ) THEN
    ALTER TABLE orders ADD COLUMN paid boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Enable RLS on invoices if not already enabled
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_user_id'
  ) THEN
    CREATE INDEX idx_invoices_user_id ON invoices(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_status'
  ) THEN
    CREATE INDEX idx_invoices_status ON invoices(status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_created_at'
  ) THEN
    CREATE INDEX idx_invoices_created_at ON invoices(created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_invoice_id'
  ) THEN
    CREATE INDEX idx_orders_invoice_id ON orders(invoice_id);
  END IF;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
  -- Drop existing policies first to avoid conflicts
  DROP POLICY IF EXISTS "sellers_read_own_invoices" ON invoices;
  DROP POLICY IF EXISTS "admin_read_all_invoices" ON invoices;
  DROP POLICY IF EXISTS "admin_create_invoices" ON invoices;
  DROP POLICY IF EXISTS "admin_update_invoices" ON invoices;

  -- Create new policies
  CREATE POLICY "sellers_read_own_invoices"
    ON invoices
    FOR SELECT
    TO authenticated
    USING (
      user_id IN (
        SELECT id FROM users 
        WHERE auth_id = auth.uid()
      )
    );

  CREATE POLICY "admin_read_all_invoices"
    ON invoices
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 1
      )
    );

  CREATE POLICY "admin_create_invoices"
    ON invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 1
      )
    );

  CREATE POLICY "admin_update_invoices"
    ON invoices
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 1
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 1
      )
    );
END $$;