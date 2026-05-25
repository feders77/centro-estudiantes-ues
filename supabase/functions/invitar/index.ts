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

    // Obtener el user actual del JWT
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) return json({ error: 'No autorizado' }, 401)

    // Verificar rol admin filtrando por id para evitar el bug con múltiples perfiles
    const { data: profile, error: profErr } = await supabaseUser
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
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

    // 4 — Verificar que el email no esté ya registrado
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, rol')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      const estado = existingProfile.rol === 'pendiente'
        ? 'pendiente de aprobación'
        : existingProfile.rol === 'administrador'
          ? 'administrador'
          : 'alumno registrado'
      return json({ error: `El email ${email} ya está en el sistema (${estado}). No es posible volver a invitarlo.` }, 409)
    }

    // 5 — Leer template de invitación personalizado (si existe)
    const { data: tpl } = await supabaseAdmin
      .from('email_templates')
      .select('asunto, cuerpo_html')
      .eq('tipo', 'invitacion')
      .single()

    const redirectTo = 'https://feders77.github.io/centro-estudiantes-ues/registro.html'

    // 6 — Enviar invitación via Supabase Auth
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { invited: true }
    })

    if (inviteErr) {
      if (inviteErr.message.toLowerCase().includes('already') || inviteErr.message.toLowerCase().includes('registered')) {
        return json({ error: `El email ${email} ya está registrado en el sistema. No es posible volver a invitarlo.` }, 409)
      }
      return json({ error: inviteErr.message }, 400)
    }

    // 7 — Actualizar template en Supabase Auth Config si tenemos token de management
    const mgmtToken = Deno.env.get('MGMT_TOKEN')
    const projectRef = Deno.env.get('SUPABASE_URL')!.split('//')[1].split('.')[0]
    if (mgmtToken && tpl) {
      await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailer_subjects_invite: tpl.asunto,
          mailer_templates_invite_content: tpl.cuerpo_html
        })
      })
    }

    // 8 — Registrar en tabla invitaciones para tracking
    await supabaseAdmin
      .from('invitaciones')
      .upsert({ email }, { onConflict: 'email' })
      .throwOnError()

    return json({ ok: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
