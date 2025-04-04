/*
  # Fix RLS policies to prevent infinite recursion

  1. Changes
    - Simplify user access policies to eliminate recursion
    - Create separate policies for self-access and admin access
    - Remove complex CASE statements that may cause recursion

  2. Security
    - Maintain row-level security
    - Ensure users can only access their own data
    - Allow admins to access all records
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;

-- Create separate policies for self-access and admin access
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON users
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

-- Update orders policies
DROP POLICY IF EXISTS "Enable read access for orders" ON orders;

CREATE POLICY "Users can read own orders"
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

CREATE POLICY "Admins can read all orders"
  ON orders
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