-- Vereinfachte Version zum Erstellen eines Benutzers
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_sent_at,
  is_super_admin,
  confirmed_at
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'aya@codservice.org',
  crypt('aya@cod2024', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  now(),
  false,
  now()
);

-- Dann den Benutzer in der users-Tabelle anlegen
INSERT INTO users (
  auth_id,
  email,
  name,
  role,
  is_active
)
SELECT 
  id,
  email,
  'Aya',
  3,
  true
FROM auth.users 
WHERE email = 'aya@codservice.org'; 