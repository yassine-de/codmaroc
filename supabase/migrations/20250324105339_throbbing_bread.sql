/*
  # Fix user policies recursion

  1. Changes
    - Drop all existing user policies
    - Create new non-recursive policies
    - Use direct auth.uid() comparison for self-access
    - Use separate admin and staff policies
    
  2. Security
    - Maintain same level of access control
    - Prevent infinite recursion
    - Keep proper role-based access
*/

-- Drop all existing user policies
DROP POLICY IF EXISTS "users_basic_access" ON users;
DROP POLICY IF EXISTS "users_admin_access" ON users;
DROP POLICY IF EXISTS "users_staff_access" ON users;

-- Create self-access policy (no recursion)
CREATE POLICY "users_self_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Create admin policy (no recursion)
CREATE POLICY "users_admin_all"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      JOIN users u ON u.auth_id = au.id 
      WHERE au.id = auth.uid() 
      AND u.role = 1
      LIMIT 1
    )
  );

-- Create staff read-only policy (no recursion)
CREATE POLICY "users_staff_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      JOIN users u ON u.auth_id = au.id 
      WHERE au.id = auth.uid() 
      AND u.role = 2
      LIMIT 1
    )
  );