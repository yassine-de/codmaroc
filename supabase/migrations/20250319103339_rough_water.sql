/*
  # Update RLS policies for staff access

  1. Changes
    - Update orders policies to allow staff access to all orders
    - Update products policies to allow staff access to all products
    
  2. Security
    - Maintain existing admin access
    - Add staff access to all records
    - Keep user self-access intact
*/

-- Drop existing policies
DROP POLICY IF EXISTS "orders_self_access" ON orders;
DROP POLICY IF EXISTS "orders_admin_access" ON orders;
DROP POLICY IF EXISTS "products_self_access" ON products;
DROP POLICY IF EXISTS "products_admin_access" ON products;

-- Create new orders policies
CREATE POLICY "orders_self_access"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "orders_staff_admin_access"
  ON orders
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

-- Create new products policies
CREATE POLICY "products_self_access"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "products_staff_admin_access"
  ON products
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

-- Update modification policies for products
CREATE POLICY "products_staff_admin_update"
  ON products
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

-- Update modification policies for orders
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