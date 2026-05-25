import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    // 1 — Verificar que el caller es admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autorizado' }, 401)

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: profile, error: profErr } = await supabaseUser
      .from('profiles')
      .select('rol')
      .single()

    if (profErr || !profile || profile.rol !== 'administrador') {
      return json({ error: 'Solo los administradores pueden invitar' }, 403)
    }

    // 2 — Obtener email del body
    const { email } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Email inválido' }, 400)
    }

    // 3 — Crear cliente admin (usa SUPABASE_SERVICE_ROLE_KEY del entorno)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 4 — Enviar invitación via Supabase Auth (usa su propio SMTP, gratis)
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://feders77.github.io/centro-estudiantes-ues/registro.html',
    })

    if (inviteErr) {
      // "User already registered" → re-send is fine for pending invites
      if (!inviteErr.message.includes('already')) {
        return json({ error: inviteErr.message }, 400)
      }
    }

    // 5 — Registrar en tabla invitaciones para tracking
    await supabaseAdmin
      .from('invitaciones')
      .upsert({ email }, { onConflict: 'email' })
      .throwOnError()

    return json({ ok: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
