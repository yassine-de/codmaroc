-- Überprüfe auth.users Tabelle
SELECT id, email, email_confirmed_at, created_at, last_sign_in_at, role
FROM auth.users
WHERE email = 'aya@codservice.org';
 
-- Überprüfe users Tabelle
SELECT id, auth_id, email, name, role, is_active
FROM users
WHERE email = 'aya@codservice.org'; 