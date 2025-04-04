/*
  # Create products table and policies

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `user_id` (integer, foreign key to users)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `sku` (text)
      - `stock` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can read their own products
      - Admins can read all products
      - Users can create their own products
      - Users can update their own products
*/

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  sku text,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Policies
CREATE POLICY "products_self_access"
  ON products
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id 
    FROM users 
    WHERE auth_id = auth.uid()
  ));

CREATE POLICY "products_admin_access"
  ON products
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 
    FROM users 
    WHERE auth_id = auth.uid() 
    AND role = 1
  ));

CREATE POLICY "products_insert_own"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT id 
    FROM users 
    WHERE auth_id = auth.uid()
  ));

CREATE POLICY "products_update_own"
  ON products
  FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id 
    FROM users 
    WHERE auth_id = auth.uid()
  ))
  WITH CHECK (user_id IN (
    SELECT id 
    FROM users 
    WHERE auth_id = auth.uid()
  ));