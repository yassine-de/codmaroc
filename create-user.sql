-- Zuerst den Auth-Benutzer erstellen
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
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'aya@codservice.org',
  crypt('aya@cod2024', gen_salt('bf')),
  now(),
  now(),
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
  id as auth_id,
  email,
  'Aya',
  3, -- Rolle 3 für Seller
  true
FROM auth.users
WHERE email = 'aya@codservice.org'; 