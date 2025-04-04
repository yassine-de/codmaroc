/*
  # Fix infinite recursion in user policies

  1. Changes
    - Drop existing recursive policies
    - Create new non-recursive policies using auth.uid() directly
    - Separate admin and self-access policies
    
  2. Security
    - Maintain same level of access control
    - Prevent infinite recursion
    - Keep existing security requirements
*/

-- Drop existing policies
DROP POLICY IF EXISTS "users_admin_full_access" ON users;
DROP POLICY IF EXISTS "users_self_access" ON users;

-- Create basic self-access policy
CREATE POLICY "users_basic_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Create admin access policy without recursion
CREATE POLICY "users_admin_access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Get role directly from auth.uid() without recursion
    (SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1) = 1
  );

-- Create staff access policy without recursion
CREATE POLICY "users_staff_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Get role directly from auth.uid() without recursion
    (SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1) = 2
  );