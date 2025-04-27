-- Vereinfachte Version zum Erstellen eines Benutzers
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  'aya@codservice.org',
  crypt('aya@cod2024', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
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