-- Benutzer in der users-Tabelle anlegen
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