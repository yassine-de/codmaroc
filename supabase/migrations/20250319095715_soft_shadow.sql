/*
  # Fix authentication schema and test users

  1. Changes
    - Drop and recreate tables with correct schema
    - Set up proper auth integration
    - Create test users with correct authentication

  2. Security
    - Maintain RLS policies
    - Set up proper auth relationships
*/

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS users;

-- Create users table with proper auth integration
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  auth_id uuid UNIQUE REFERENCES auth.users(id),
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
  user_id integer NOT NULL REFERENCES users(id),
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
  USING (auth_id = auth.uid());

CREATE POLICY "Admin can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING ((SELECT role FROM users WHERE auth_id = auth.uid()) = 1);

-- Create policies for orders table
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) OR 
    (SELECT role FROM users WHERE auth_id = auth.uid()) = 1
  );

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) OR 
    (SELECT role FROM users WHERE auth_id = auth.uid()) = 1
  );

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_id ON users(auth_id);
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

-- Clean up existing test users
DELETE FROM auth.users WHERE email IN (
  'admin@codservice.com',
  'staff@codservice.com',
  'seller@codservice.com'
);

-- Create test users in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES 
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin@codservice.com',
    crypt('start123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'staff@codservice.com',
    crypt('start123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'seller@codservice.com',
    crypt('start123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

-- Insert corresponding entries in users table
INSERT INTO users (auth_id, name, email, phone, role, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@codservice.com', '+1234567890', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Staff User', 'staff@codservice.com', '+1234567891', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'Seller User', 'seller@codservice.com', '+1234567892', 3, true);