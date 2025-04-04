-- Drop all existing policies
DROP POLICY IF EXISTS "users_self_access" ON users;
DROP POLICY IF EXISTS "users_admin_access" ON users;
DROP POLICY IF EXISTS "users_basic_access" ON users;

-- Create simplified policies without recursion
CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow users to see their own data
    auth_id = auth.uid() OR
    -- Allow admins to see all data (using direct auth.uid() check)
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.auth_id = au.id 
        AND u.role = 1
      )
    )
  );

-- Admin-only policies for modification operations
CREATE POLICY "users_admin_insert"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.auth_id = au.id 
        AND u.role = 1
      )
    )
  );

CREATE POLICY "users_admin_update"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.auth_id = au.id 
        AND u.role = 1
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.auth_id = au.id 
        AND u.role = 1
      )
    )
  );

CREATE POLICY "users_admin_delete"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      WHERE au.id = auth.uid() 
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.auth_id = au.id 
        AND u.role = 1
      )
    )
  );

-- Create index to optimize the join
CREATE INDEX IF NOT EXISTS idx_users_auth_id_role ON users(auth_id, role);