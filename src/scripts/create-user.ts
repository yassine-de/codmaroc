import { supabase } from '../lib/supabase'

async function createUser() {
  try {
    // First create the auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.signUp({
      email: 'aya@codservice.org',
      password: 'aya@cod2024'
    })

    if (authError) throw authError
    if (!authUser) throw new Error('Failed to create auth user')

    // Then create the user profile
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .insert([
        {
          auth_id: authUser.id,
          email: 'aya@codservice.org',
          name: 'Aya',
          role: 3 // Default role for sellers
        }
      ])
      .select()
      .single()

    if (profileError) throw profileError

    console.log('User created successfully:', userData)
  } catch (error) {
    console.error('Error creating user:', error)
  }
}

createUser() 