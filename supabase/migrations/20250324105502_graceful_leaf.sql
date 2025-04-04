/*
  # Undo recent policy changes

  1. Changes
    - Drop policies created in the last migration
    - Restore original policies
    
  2. Security
    - Maintain proper access control
    - Keep existing security model
*/

-- Drop recently added policies
DROP POLICY IF EXISTS "users_self_access" ON users;
DROP POLICY IF EXISTS "users_admin_all" ON users;
DROP POLICY IF EXISTS "users_staff_read" ON users;

-- Restore original policies
CREATE POLICY "users_basic_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "users_admin_access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE auth_id = auth.uid() 
      AND role = 1
    )
  );