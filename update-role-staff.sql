-- Rolle in der users-Tabelle auf Staff (2) ändern
UPDATE users
SET role = 2
WHERE email = 'aya@codservice.org';
 
-- Überprüfen der Änderung
SELECT id, auth_id, email, name, role, is_active
FROM users
WHERE email = 'aya@codservice.org'; 