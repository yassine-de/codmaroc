-- Update the password for the existing user
UPDATE auth.users
SET encrypted_password = crypt('aya@cod2024', gen_salt('bf'))
WHERE email = 'aya@codservice.org'; 