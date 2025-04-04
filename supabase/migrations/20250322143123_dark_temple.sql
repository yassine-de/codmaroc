/*
  # Add Test Users

  1. New Users
    - 4 Sellers:
      - Yassine (yassine@codservice.org)
      - Hassan (hassan@codservice.org)
      - Farid (farid@codeservice.org)
      - Adil (adil@codeservice.org)
    - 1 Staff:
      - Rania (rania@codservice.org)

  2. Security
    - Proper password hashing
    - Correct role assignments
    - Auth and user table synchronization
*/

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
  -- Yassine (Seller)
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'yassine@codservice.org',
    crypt('yassine1@5cod', gen_salt('bf')),
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
  -- Hassan (Seller)
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'hassan@codservice.org',
    crypt('hassan3@4service', gen_salt('bf')),
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
  -- Farid (Seller)
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'farid@codeservice.org',
    crypt('farid5@6codeser', gen_salt('bf')),
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
  -- Adil (Seller)
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'adil@codeservice.org',
    crypt('adil@coce1979', gen_salt('bf')),
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
  -- Rania (Staff)
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'rania@codservice.org',
    crypt('rania@codservice', gen_salt('bf')),
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

-- Create corresponding entries in users table
INSERT INTO users (auth_id, name, email, phone, role, is_active)
SELECT 
  id as auth_id,
  CASE 
    WHEN email = 'yassine@codservice.org' THEN 'Yassine'
    WHEN email = 'hassan@codservice.org' THEN 'Hassan'
    WHEN email = 'farid@codeservice.org' THEN 'Farid'
    WHEN email = 'adil@codeservice.org' THEN 'Adil'
    WHEN email = 'rania@codservice.org' THEN 'Rania'
  END as name,
  email,
  '+1234567890' as phone,
  CASE 
    WHEN email = 'rania@codservice.org' THEN 2 -- Staff role
    ELSE 3 -- Seller role
  END as role,
  true as is_active
FROM auth.users
WHERE email IN (
  'yassine@codservice.org',
  'hassan@codservice.org',
  'farid@codeservice.org',
  'adil@codeservice.org',
  'rania@codservice.org'
)
AND NOT EXISTS (
  SELECT 1 FROM users WHERE email = auth.users.email
);