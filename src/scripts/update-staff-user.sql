-- Update the user's role to staff (2) if they exist
UPDATE public.users
SET role = 2 -- Staff role
WHERE email = 'aya@codservice.org';

-- If the user doesn't exist, create them
INSERT INTO public.users (
  id,
  auth_id,
  email,
  name,
  role,
  is_active,
  created_at
)
SELECT 
  nextval('users_id_seq'),
  (SELECT id FROM auth.users WHERE email = 'aya@codservice.org'),
  'aya@codservice.org',
  'Aya',
  2, -- Staff role
  true,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'aya@codservice.org'
); 