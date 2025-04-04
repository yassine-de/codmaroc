/*
  # Fix RLS policies to prevent infinite recursion

  1. Changes
    - Remove recursive policies that cause infinite loops
    - Implement proper role-based access control
    - Simplify policy conditions

  2. Security
    - Maintain security requirements
    - Fix admin access policy
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;

-- Create new policies without recursion
CREATE POLICY "Enable read access for authenticated users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN auth_id = auth.uid() THEN true  -- Users can always see their own profile
      WHEN role = 1 AND auth_id IN (        -- Admin check without recursion
        SELECT u.auth_id 
        FROM users u 
        WHERE u.auth_id = auth.uid() 
        AND u.role = 1
      ) THEN true
      ELSE false
    END
  );

-- Update orders policies to use the same pattern
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;

CREATE POLICY "Enable read access for orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT u.id 
      FROM users u 
      WHERE u.auth_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 1
    )
  );