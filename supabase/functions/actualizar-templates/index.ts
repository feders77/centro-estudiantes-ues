import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeo entre tipo interno y campos de la Management API de Supabase
const SUPABASE_TEMPLATE_MAP: Record<string, { subject: string; content: string }> = {
  invitacion:        { subject: 'mailer_subjects_invite',       content: 'mailer_templates_invite_content' },
  confirmacion_email:{ subject: 'mailer_subjects_confirmation',  content: 'mailer_templates_confirmation_content' },
  recuperar_password:{ subject: 'mailer_subjects_recovery',      content: 'mailer_templates_recovery_content' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autorizado' }, 401)

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) return json({ error: 'No autorizado' }, 401)

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!profile || profile.rol !== 'administrador') {
      return json({ error: 'Solo los administradores pueden editar templates' }, 403)
    }

    const { tipo, asunto, cuerpo_html } = await req.json()
    if (!tipo || !asunto || !cuerpo_html) {
      return json({ error: 'Faltan campos: tipo, asunto, cuerpo_html' }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Guardar en DB
    const { error: dbErr } = await supabaseAdmin
      .from('email_templates')
      .upsert({ tipo, asunto, cuerpo_html, updated_at: new Date().toISOString() })

    if (dbErr) return json({ error: dbErr.message }, 500)

    // Actualizar en Supabase Auth via Management API si el tipo está mapeado
    const mgmtToken = Deno.env.get('MGMT_TOKEN')
    const apiFields = SUPABASE_TEMPLATE_MAP[tipo]

    if (mgmtToken && apiFields) {
      const projectRef = Deno.env.get('SUPABASE_URL')!.split('//')[1].split('.')[0]
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${mgmtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [apiFields.subject]: asunto,
          [apiFields.content]: cuerpo_html
        })
      })
      if (!res.ok) {
        const errTxt = await res.text()
        console.error('Management API error:', errTxt)
        // No falla — el template está guardado en DB igual
        return json({ ok: true, warning: 'Template guardado en DB pero no pudo actualizarse en Supabase Auth: ' + errTxt })
      }
    }

    return json({ ok: true, supabase_updated: !!(mgmtToken && apiFields) })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
