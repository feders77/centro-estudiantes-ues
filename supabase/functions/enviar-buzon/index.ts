import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashIP(ip: string): Promise<string> {
  const salt = Deno.env.get('IP_SALT') || 'ce-buzon-salt-2026'
  const enc  = new TextEncoder()
  const data = enc.encode(ip + salt)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 20)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    const { categoria, mensaje, curso, accion, anonimo } = await req.json()

    // Validate
    if (!mensaje?.trim() || mensaje.trim().length < 5)
      return json({ error: 'El mensaje es demasiado corto.' }, 400)
    if (mensaje.trim().length > 3000)
      return json({ error: 'El mensaje es demasiado largo (máx. 3000 caracteres).' }, 400)
    if (!categoria?.trim())
      return json({ error: 'Seleccioná una categoría.' }, 400)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let userId: string | null = null
    let ipHash: string | null = null
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()

    if (!anonimo) {
      // Require valid session for identified messages
      const authHeader = req.headers.get('Authorization')
      if (!authHeader)
        return json({ error: 'Iniciá sesión para enviar un mensaje identificado.' }, 401)

      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await supabaseUser.auth.getUser()
      if (!user)
        return json({ error: 'Sesión inválida. Iniciá sesión e intentá de nuevo.' }, 401)
      userId = user.id

      // Rate limit: max 10 per user per hour
      const { count } = await supabaseAdmin
        .from('buzon_mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo)
      if ((count ?? 0) >= 10)
        return json({ error: 'Enviaste demasiados mensajes. Esperá un rato.' }, 429)

    } else {
      // Rate limit anonymous by hashed IP: max 3 per hour
      const rawIP =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
      ipHash = await hashIP(rawIP)

      const { count } = await supabaseAdmin
        .from('buzon_mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', oneHourAgo)
      if ((count ?? 0) >= 3)
        return json({
          error:
            'Límite alcanzado: máx. 3 mensajes anónimos por hora desde la misma conexión. Intentá más tarde.',
        }, 429)
    }

    const { error: insErr } = await supabaseAdmin.from('buzon_mensajes').insert({
      categoria,
      mensaje:  mensaje.trim(),
      curso:    curso?.trim()  || null,
      accion:   accion?.trim() || null,
      anonimo:  anonimo ?? true,
      user_id:  userId,
      ip_hash:  ipHash,
    })

    if (insErr) return json({ error: 'Error al guardar el mensaje. Intentá de nuevo.' }, 500)

    return json({ ok: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
