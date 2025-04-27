-- First create the auth user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(), -- Generate a UUID for the id
  'aya@codservice.org',
  crypt('aya@cod2024', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Then create the user profile with staff role (2)
INSERT INTO public.users (
  id,
  auth_id,
  email,
  name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  nextval('users_id_seq'), -- Use the sequence for the id
  (SELECT id FROM auth.users WHERE email = 'aya@codservice.org'),
  'aya@codservice.org',
  'Aya',
  2, -- Staff role
  true,
  now(),
  now()
); 