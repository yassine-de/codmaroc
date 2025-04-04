import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import router from '../router'

interface UserData {
  id: number
  auth_id: string
  name: string
  email: string
  phone: string | null
  role: number
  is_active: boolean
  created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<(User & { role?: number }) | null>(null)

  const login = async (email: string, password: string) => {
    try {
      // First sign in with Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError
      if (!authUser) throw new Error('Authentication failed')

      // Get additional user data from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        throw userError
      }

      // Combine auth user with role from users table
      user.value = {
        ...authUser,
        role: userData.role
      }

      router.push('/dashboard')
      return userData
    } catch (error: any) {
      console.error('Error logging in:', error)
      throw error
    }
  }

  const register = async (email: string, password: string, name: string, phone: string) => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) throw error

      if (authUser) {
        // Create user profile in our users table
        const { data: userData, error: profileError } = await supabase
          .from('users')
          .insert([
            {
              auth_id: authUser.id,
              email,
              name,
              phone,
              role: 3 // Default role
            }
          ])
          .select()
          .single()

        if (profileError) throw profileError

        // Set the user with role
        user.value = {
          ...authUser,
          role: userData.role
        }
      }

      return authUser
    } catch (error) {
      console.error('Error registering:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      user.value = null
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      throw error
    }
  }

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Get user role from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', authUser.id)
          .single()

        if (userError) throw userError

        // Set the user with role
        user.value = {
          ...authUser,
          role: userData.role
        }
      } else {
        user.value = null
      }
    } catch (error) {
      console.error('Error checking user:', error)
      user.value = null
    }
  }

  return {
    user,
    login,
    logout,
    register,
    checkUser
  }
})