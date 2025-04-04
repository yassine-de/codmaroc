/*
  # Fix RLS policies infinite recursion

  1. Changes
    - Drop existing policies that cause recursion
    - Create new simplified policies for users table
    - Create new simplified policies for orders table
    
  2. Security
    - Maintain same level of access control
    - Prevent infinite recursion in policy evaluation
    - Ensure proper separation between user and admin access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "users_self_access" ON users;
DROP POLICY IF EXISTS "users_admin_access" ON users;
DROP POLICY IF EXISTS "orders_self_access" ON orders;
DROP POLICY IF EXISTS "orders_admin_access" ON orders;

-- Create new user policies without recursion
CREATE POLICY "users_self_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "users_admin_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (role = 1 AND auth_id = auth.uid());

-- Create new order policies without recursion
CREATE POLICY "orders_self_access"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id 
    FROM users 
    WHERE auth_id = auth.uid()
  ));

CREATE POLICY "orders_admin_access"
  ON orders
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 
    FROM users 
    WHERE auth_id = auth.uid() 
    AND role = 1
  ));