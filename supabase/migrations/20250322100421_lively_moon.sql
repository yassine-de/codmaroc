/*
  # Fix integration deletion policies

  1. Changes
    - Add DELETE policies for integrations table
    - Fix existing SELECT policies
    - Ensure proper user access control for deletion
    
  2. Security
    - Only allow users to delete their own integrations
    - Maintain existing access control for other operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "integrations_self_access" ON integrations;
DROP POLICY IF EXISTS "integrations_admin_access" ON integrations;
DROP POLICY IF EXISTS "integrations_insert_own" ON integrations;
DROP POLICY IF EXISTS "integrations_update_own" ON integrations;

-- Create new policies with proper DELETE access
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

CREATE POLICY "integrations_admin_access"
  ON integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE auth_id = auth.uid() 
      AND role = 1
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

-- Add explicit DELETE policy
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