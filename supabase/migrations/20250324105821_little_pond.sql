-- Drop all existing policies
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_admin_insert" ON users;
DROP POLICY IF EXISTS "users_admin_update" ON users;
DROP POLICY IF EXISTS "users_admin_delete" ON users;

-- Create a single, simple policy for SELECT
CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own data
    auth_id = auth.uid()
  );

-- Create a separate policy for admin SELECT
CREATE POLICY "users_admin_select"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Check if the user is an admin without recursion
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.auth_id = au.id 
        AND u.role = 1
        AND u.auth_id IS NOT NULL
      )
    )
  );

-- Create a single policy for admin operations (INSERT, UPDATE, DELETE)
CREATE POLICY "users_admin_all"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Check if the user is an admin without recursion
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.auth_id = au.id 
        AND u.role = 1
        AND u.auth_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    -- Check if the user is an admin without recursion
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.auth_id = au.id 
        AND u.role = 1
        AND u.auth_id IS NOT NULL
      )
    )
  );

-- Create index to optimize the join
CREATE INDEX IF NOT EXISTS idx_users_auth_id_role ON users(auth_id, role);

-- Add NOT NULL constraint to auth_id if not already present
ALTER TABLE users ALTER COLUMN auth_id SET NOT NULL;