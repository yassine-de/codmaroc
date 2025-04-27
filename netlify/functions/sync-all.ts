import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { handleSync } from '../../src/lib/sync'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const handler: Handler = async (event) => {
  const token = event.headers.authorization?.replace('Bearer ', '')

  if (token !== process.env.SYNC_SECRET) {
    return {
      statusCode: 401,
      body: 'Unauthorized'
    }
  }

  try {
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('auto_sync', true)

    if (error) throw new Error(error.message)

    const results = []

    for (const integration of integrations || []) {
      const stats = await handleSync(supabase, integration)
      results.push({ integrationId: integration.id, stats })
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'All sheets synced', results })
    }
  } catch (err: any) {
    console.error('❌ Sync error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    }
  }
}

export { handler }
