/*
  # Fix orders RLS policies for proper role-based access

  1. Changes
    - Drop existing policies
    - Create new policies for different user roles
    - Ensure sellers can only see their own orders
    - Allow staff and admin to see all orders
    
  2. Security
    - Maintain proper access control based on user role
    - Prevent sellers from seeing other sellers' orders
*/

-- Drop existing policies
DROP POLICY IF EXISTS "orders_self_access" ON orders;
DROP POLICY IF EXISTS "orders_staff_admin_access" ON orders;
DROP POLICY IF EXISTS "orders_staff_admin_update" ON orders;

-- Create new policies
CREATE POLICY "orders_seller_access"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    (
      -- User is a seller (role = 3) and owns the order
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 3 
        AND id = orders.user_id
      )
    ) OR
    -- User is staff or admin (role = 1 or 2)
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  );

-- Allow sellers to create their own orders
CREATE POLICY "orders_seller_insert"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE auth_id = auth.uid()
    ) OR
    -- Allow staff and admin to create orders for any user
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  );

-- Allow sellers to update their own orders
CREATE POLICY "orders_seller_update"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    (
      -- User is a seller and owns the order
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 3 
        AND id = orders.user_id
      )
    ) OR
    -- User is staff or admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  )
  WITH CHECK (
    (
      -- User is a seller and owns the order
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 3 
        AND id = orders.user_id
      )
    ) OR
    -- User is staff or admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  );

-- Allow sellers to delete their own orders
CREATE POLICY "orders_seller_delete"
  ON orders
  FOR DELETE
  TO authenticated
  USING (
    (
      -- User is a seller and owns the order
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 3 
        AND id = orders.user_id
      )
    ) OR
    -- User is staff or admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role IN (1, 2)
    )
  );