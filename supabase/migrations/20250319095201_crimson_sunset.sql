/*
  # Add test users

  1. Changes
    - Add three test users: admin, staff, and seller
    - Each user has corresponding auth.users entry and users table entry
    - Set appropriate roles for each user

  2. Security
    - Users are created with proper auth_id references
    - Roles are properly assigned (1=admin, 2=staff, 3=seller)
*/

-- Insert test users into auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@codservice.com', crypt('start123', gen_salt('bf')), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'staff@codservice.com', crypt('start123', gen_salt('bf')), now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'seller@codservice.com', crypt('start123', gen_salt('bf')), now(), now(), now());

-- Insert corresponding entries in our users table
INSERT INTO users (auth_id, name, email, phone, role, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@codservice.com', '+1234567890', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Staff User', 'staff@codservice.com', '+1234567891', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'Seller User', 'seller@codservice.com', '+1234567892', 3, true);