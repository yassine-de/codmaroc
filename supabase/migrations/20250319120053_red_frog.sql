/*
  # Add update policy for staff and admin users

  1. Changes
    - Add policy for staff and admin to update orders
    - Fix existing update policies
    
  2. Security
    - Only staff and admin can update order status
    - Maintain existing security policies
*/

-- Drop existing update policies if they exist
DROP POLICY IF EXISTS "orders_update_own" ON orders;
DROP POLICY IF EXISTS "orders_staff_admin_update" ON orders;

-- Create new update policy for staff and admin
CREATE POLICY "orders_staff_admin_update"
  ON orders
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