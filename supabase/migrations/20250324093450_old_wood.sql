/*
  # Fix staff access for integrations

  1. Changes
    - Add staff access policies for integrations table
    - Allow staff to read all integrations
    - Allow staff to sync integrations
    
  2. Security
    - Maintain existing admin and user policies
    - Add proper staff-level access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "integrations_self_access" ON integrations;
DROP POLICY IF EXISTS "integrations_admin_access" ON integrations;
DROP POLICY IF EXISTS "integrations_insert_own" ON integrations;
DROP POLICY IF EXISTS "integrations_update_own" ON integrations;
DROP POLICY IF EXISTS "integrations_delete_own" ON integrations;

-- Create new policies with staff access
CREATE POLICY "integrations_self_access"
  ON integrations
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "integrations_staff_admin_access"
  ON integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2) -- Allow both admin (1) and staff (2)
    )
  );

CREATE POLICY "integrations_insert_own"
  ON integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "integrations_update_own"
  ON integrations
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "integrations_staff_admin_update"
  ON integrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  );

CREATE POLICY "integrations_delete_own"
  ON integrations
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "integrations_staff_admin_delete"
  ON integrations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  );