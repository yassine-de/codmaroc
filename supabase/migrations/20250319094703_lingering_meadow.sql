/*
  # Initial Database Schema Setup

  1. New Tables
    - `users`
      - `id` (serial, primary key) - Auto-incrementing user identifier
      - `name` (text) - User's full name
      - `email` (text, unique) - User's email address
      - `phone` (text) - User's phone number
      - `role` (integer) - User's role (1: Admin, 2: Staff, 3: Seller)
      - `is_active` (boolean) - Account status
      - `created_at` (timestamp) - Account creation date

    - `orders`
      - `id` (serial, primary key) - Auto-incrementing order identifier
      - `user_id` (integer) - References users(id)
      - `total_amount` (decimal) - Total order amount
      - `status` (integer) - Order status (1: Pending, 2: Confirmed, 3: Delivered, 4: Cancelled)
      - `shipping_address` (text) - Delivery address
      - `phone` (text) - Contact phone
      - `notes` (text) - Additional notes
      - `created_at` (timestamp) - Order creation date
      - `updated_at` (timestamp) - Last update date

  2. Security
    - Enable RLS on both tables
    - Add policies for data access based on user role and ownership
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
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
  USING (id = current_setting('user.id', true)::integer);

CREATE POLICY "Admin can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (current_setting('user.role', true)::integer = 1);

-- Create policies for orders table
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = current_setting('user.id', true)::integer OR 
    current_setting('user.role', true)::integer = 1
  );

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('user.id', true)::integer);

CREATE POLICY "Users can update their own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    user_id = current_setting('user.id', true)::integer OR 
    current_setting('user.role', true)::integer = 1
  );

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Create trigger for updating the updated_at timestamp
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