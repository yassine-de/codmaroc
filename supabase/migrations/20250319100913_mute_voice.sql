/*
  # Fix RLS policies to prevent recursion

  1. Changes
    - Drop existing policies that may cause recursion
    - Create simplified policies for users table
    - Create simplified policies for orders table
    
  2. Security
    - Maintain separate policies for users and admins
    - Use direct auth.uid() comparison for user access
    - Use simple role check for admin access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_admin_read_all" ON users;
DROP POLICY IF EXISTS "orders_read_own" ON orders;
DROP POLICY IF EXISTS "orders_admin_read_all" ON orders;

-- Create simplified user policies
CREATE POLICY "users_self_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "users_admin_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND role = 1 
    LIMIT 1
  ));

-- Create simplified order policies
CREATE POLICY "orders_self_access"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND id = orders.user_id
    )
  );

CREATE POLICY "orders_admin_access"
  ON orders
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND role = 1 
    LIMIT 1
  ));