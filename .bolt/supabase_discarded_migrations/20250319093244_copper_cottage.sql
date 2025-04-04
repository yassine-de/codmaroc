/*
  # Create test users

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `password` (text)
      - `phone` (text)
      - `role` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  phone text,
  role integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Insert test users
INSERT INTO users (name, email, password, role, phone, is_active)
VALUES 
  ('Admin User', 'admin@codservice.com', 'start123', 1, '+1234567890', true),
  ('Staff User', 'staff@codservice.com', 'start123', 2, '+1234567891', true),
  ('Seller User', 'seller@codservice.com', 'start123', 3, '+1234567892', true);