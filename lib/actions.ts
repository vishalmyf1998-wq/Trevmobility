'use server'

import { createClient } from '@supabase/supabase-js'

export async function sendInviteEmail(email: string, name: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return { success: false, error: 'Server configuration error: Missing Supabase credentials' }
    }

    // Initialize Supabase Admin client with the service_role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Send the invite using Supabase Auth Admin API
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { name } })
    if (error) throw error

    return { success: true, user: data.user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}