/*
  # Fix user policies to allow admin to see all users

  1. Changes
    - Drop existing user policies
    - Create new policies that allow admin to see all users
    - Update integration policies for proper seller access
    
  2. Security
    - Maintain proper access control
    - Keep existing security measures
*/

-- Drop existing user policies
DROP POLICY IF EXISTS "users_self_access" ON users;
DROP POLICY IF EXISTS "users_admin_access" ON users;

-- Create new user policies
CREATE POLICY "users_admin_full_access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role = 1
    )
  );

CREATE POLICY "users_self_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Update integration policies
DROP POLICY IF EXISTS "integrations_staff_admin_access" ON integrations;

CREATE POLICY "integrations_staff_admin_access"
  ON integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  );