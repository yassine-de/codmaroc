-- Drop existing policies
DROP POLICY IF EXISTS "users_basic_access" ON users;
DROP POLICY IF EXISTS "users_admin_access" ON users;

-- Create non-recursive policies using auth.users join
CREATE POLICY "users_self_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "users_admin_access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Use a direct join with auth.users to avoid recursion
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      JOIN users u ON u.auth_id = au.id 
      WHERE au.id = auth.uid() 
      AND u.role = 1
      AND u.auth_id = au.id -- Additional check to ensure correct user
    )
  );

-- Create index to optimize the join
CREATE INDEX IF NOT EXISTS idx_users_auth_id_role ON users(auth_id, role);