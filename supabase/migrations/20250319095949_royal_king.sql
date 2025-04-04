/*
  # Fix RLS policies with simplified conditions

  1. Changes
    - Remove all existing policies to start fresh
    - Implement simplified policies without nested queries
    - Separate admin and user access clearly
    - Use direct auth.uid() comparison where possible

  2. Security
    - Maintain row-level security
    - Ensure users can only access their own data
    - Allow admins to access all records
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
DROP POLICY IF EXISTS "Enable read access for orders" ON orders;

-- Create basic user self-access policy
CREATE POLICY "users_read_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Create admin access policy with direct role check
CREATE POLICY "users_admin_read_all"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE auth_id = auth.uid()) = 1
  );

-- Create basic order self-access policy
CREATE POLICY "orders_read_own"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Create admin order access policy
CREATE POLICY "orders_admin_read_all"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE auth_id = auth.uid()) = 1
  );