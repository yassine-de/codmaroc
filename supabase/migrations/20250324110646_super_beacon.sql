/*
  # Fix RLS policies to prevent infinite recursion

  1. Changes
    - Drop existing policies that cause recursion
    - Create simplified policies that avoid checking roles recursively
    - Use direct auth.uid() checks where possible
    
  2. Security
    - Maintain same level of access control
    - Prevent infinite recursion in policy evaluation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_admin_read_all" ON users;
DROP POLICY IF EXISTS "users_admin_insert" ON users;
DROP POLICY IF EXISTS "users_admin_update" ON users;
DROP POLICY IF EXISTS "users_admin_delete" ON users;

-- Create a materialized view for user roles to avoid recursion
CREATE MATERIALIZED VIEW IF NOT EXISTS user_roles AS
SELECT auth_id, role
FROM users;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_auth_id ON user_roles(auth_id);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh the view
DROP TRIGGER IF EXISTS refresh_user_roles_trigger ON users;
CREATE TRIGGER refresh_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_roles();

-- Create new policies using the materialized view
CREATE POLICY "users_read_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "users_admin_all"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_roles 
      WHERE auth_id = auth.uid() 
      AND role = 1
    )
  );

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW user_roles;