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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autorizado' }, 401)

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) return json({ error: 'No autorizado' }, 401)

    const { data: adminProfile } = await supabaseUser
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (!adminProfile || adminProfile.rol !== 'administrador') {
      return json({ error: 'Solo los administradores pueden eliminar comentarios' }, 403)
    }

    const { tipo, com_id, item_id, item_ref, user_id, user_email, user_nombre, texto, motivo } = await req.json()

    if (!tipo || !com_id || !motivo) {
      return json({ error: 'Faltan campos requeridos' }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1 — Eliminar el comentario
    const tabla = tipo === 'novedad' ? 'novedades_comentarios' : 'eventos_comentarios'
    const campo = tipo === 'novedad' ? 'novedad_id' : 'evento_id'
    await supabaseAdmin.from(tabla).delete().eq('id', com_id)

    // 2 — Guardar en auditoría
    await supabaseAdmin.from('comentarios_eliminados').insert({
      tipo, item_id, item_ref, user_id, user_email, user_nombre,
      texto, motivo, deleted_by: user.id
    })

    // 3 — Leer template de email
    const { data: tpl } = await supabaseAdmin
      .from('email_templates')
      .select('asunto, cuerpo_html')
      .eq('tipo', 'eliminacion_comentario')
      .single()

    // 4 — Enviar email via Resend (si hay API key)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && user_email && tpl) {
      const asunto = tpl.asunto
      const cuerpo = tpl.cuerpo_html
        .replace(/\{\{\s*nombre\s*\}\}/g, user_nombre || 'Usuario')
        .replace(/\{\{\s*referencia\s*\}\}/g, item_ref || 'la plataforma')
        .replace(/\{\{\s*motivo\s*\}\}/g, motivo)

      const fromAddr = Deno.env.get('RESEND_FROM') || 'Centro de Estudiantes <onboarding@resend.dev>'

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [user_email],
          subject: asunto,
          html: cuerpo
        })
      })
    }

    return json({ ok: true, email_sent: !!(resendKey && user_email) })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
