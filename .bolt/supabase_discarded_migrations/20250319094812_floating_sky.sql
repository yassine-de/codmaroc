/*
  # Fix authentication schema

  1. Changes
    - Remove password field from users table as it's handled by Supabase Auth
    - Update user id to use uuid type to match Supabase Auth
    - Update foreign key in orders table
    - Update RLS policies to use auth.uid()

  2. Security
    - Update RLS policies to use Supabase Auth uid
*/

-- Drop existing tables and start fresh
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS users;

-- Create users table with uuid
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role integer NOT NULL DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  total_amount decimal(10,2) NOT NULL DEFAULT 0.00,
  status integer NOT NULL DEFAULT 1,
  shipping_address text NOT NULL,
  phone text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 1);

-- Create policies for orders table
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 1
  );

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 1
  );

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();