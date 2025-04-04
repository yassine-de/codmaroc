/*
  # Fix test users authentication

  1. Changes
    - Drop and recreate test users with proper authentication
    - Ensure passwords are properly hashed
    - Set up correct auth_id references

  2. Security
    - Maintain existing RLS policies
    - Keep user roles intact
*/

-- First, clean up existing test users
DELETE FROM users WHERE email IN (
  'admin@codservice.com',
  'staff@codservice.com',
  'seller@codservice.com'
);

DELETE FROM auth.users WHERE email IN (
  'admin@codservice.com',
  'staff@codservice.com',
  'seller@codservice.com'
);

-- Create new test users in auth.users with properly hashed passwords
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES 
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@codservice.com', crypt('start123', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'staff@codservice.com', crypt('start123', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'seller@codservice.com', crypt('start123', gen_salt('bf')), now(), now(), now());

-- Insert corresponding entries in our users table
INSERT INTO users (auth_id, name, email, phone, role, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@codservice.com', '+1234567890', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Staff User', 'staff@codservice.com', '+1234567891', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'Seller User', 'seller@codservice.com', '+1234567892', 3, true);