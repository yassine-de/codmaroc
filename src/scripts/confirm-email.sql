-- Confirm the email address by setting email_confirmed_at
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'aya@codservice.org'; 