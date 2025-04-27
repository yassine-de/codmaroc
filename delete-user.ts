import { createClient } from '@supabase/supabase-js'

// Supabase-Client mit Admin-Rechten erstellen
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
})

async function deleteUser() {
  const userEmail = 'aya@codservice.org'
  
  try {
    // Zuerst den Benutzer aus der users-Tabelle löschen
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('email', userEmail)

    if (profileError) {
      console.error('Fehler beim Löschen des Benutzerprofils:', profileError)
      return
    }

    // Dann den Auth-Benutzer löschen
    const { data: userData } = await supabase
      .from('users')
      .select('auth_id')
      .eq('email', userEmail)
      .single()

    if (userData?.auth_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(
        userData.auth_id
      )

      if (authError) {
        console.error('Fehler beim Löschen des Auth-Benutzers:', authError)
        return
      }
    }

    console.log('Benutzer erfolgreich gelöscht')
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error)
  }
}

deleteUser() 