-- Berechtigungen für die materialisierte View korrigieren
GRANT ALL ON user_roles TO postgres;
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON user_roles TO service_role;

-- Berechtigungen für die users-Tabelle überprüfen und korrigieren
GRANT ALL ON users TO postgres;
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;

-- Berechtigungen für auth.users überprüfen und korrigieren
GRANT ALL ON auth.users TO postgres;
GRANT ALL ON auth.users TO authenticated;
GRANT ALL ON auth.users TO service_role; 