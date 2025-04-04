-- Drop all existing policies
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_admin_select" ON users;
DROP POLICY IF EXISTS "users_admin_all" ON users;

-- Create simple policies without recursion
CREATE POLICY "users_read_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "users_admin_read_all"
  ON users
  FOR SELECT
  TO authenticated
  USING (role = 1);

CREATE POLICY "users_admin_insert"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (role = 1);

CREATE POLICY "users_admin_update"
  ON users
  FOR UPDATE
  TO authenticated
  USING (role = 1)
  WITH CHECK (role = 1);

CREATE POLICY "users_admin_delete"
  ON users
  FOR DELETE
  TO authenticated
  USING (role = 1);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id_role ON users(auth_id, role);

-- Add net_payment column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS net_payment numeric(10,2) NOT NULL DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_net_payment ON invoices(net_payment);