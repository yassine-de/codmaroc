-- E-Mail-Adresse bestätigen
UPDATE auth.users
SET 
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'aya@codservice.org'; 