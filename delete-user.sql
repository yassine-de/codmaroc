-- Zuerst den Benutzer aus der users-Tabelle löschen
DELETE FROM users 
WHERE email = 'aya@codservice.org';
 
-- Dann den Benutzer aus der auth.users-Tabelle löschen
DELETE FROM auth.users 
WHERE email = 'aya@codservice.org'; 