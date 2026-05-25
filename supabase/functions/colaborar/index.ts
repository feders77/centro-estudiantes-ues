import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,apikey,authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { nombre, email, comision, mensaje } = await req.json();
    if (!nombre || !email || !mensaje) {
      return new Response(JSON.stringify({ error: 'Faltan campos' }), { status: 400, headers: CORS });
    }

    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY');

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Obtener IDs de administradores
    const { data: adminProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('rol', 'administrador');

    const adminEmails: string[] = [];
    for (const p of (adminProfiles || [])) {
      const { data: userData } = await admin.auth.admin.getUserById(p.id);
      if (userData?.user?.email) adminEmails.push(userData.user.email);
    }

    if (!adminEmails.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: CORS });
    }

    if (!RESEND_API_KEY) {
      console.log('Sin RESEND_API_KEY — destinatarios serían:', adminEmails);
      return new Response(JSON.stringify({ ok: true, sent: 0, note: 'sin email key' }), { headers: CORS });
    }

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Helvetica Neue',sans-serif;background:#f5efe6;margin:0;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#7a1f2b;padding:28px 32px">
      <h1 style="color:#f5efe6;font-size:20px;margin:0;font-weight:700">Postulación: Quiero ayudar</h1>
      <p style="color:rgba(245,239,230,.75);font-size:13px;margin:6px 0 0">Centro de Estudiantes · Sagrado Corazón Rosario</p>
    </div>
    <div style="padding:32px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#4a3f3a;font-weight:600;width:130px">Nombre</td><td style="padding:8px 0">${escHtml(nombre)}</td></tr>
        <tr><td style="padding:8px 0;color:#4a3f3a;font-weight:600">Email</td><td style="padding:8px 0"><a href="mailto:${escHtml(email)}" style="color:#7a1f2b">${escHtml(email)}</a></td></tr>
        ${comision ? `<tr><td style="padding:8px 0;color:#4a3f3a;font-weight:600">Área de interés</td><td style="padding:8px 0">${escHtml(comision)}</td></tr>` : ''}
      </table>
      <div style="background:#f5efe6;border-radius:10px;padding:18px;margin-top:16px;font-size:14px;line-height:1.6;white-space:pre-wrap">${escHtml(mensaje)}</div>
    </div>
    <div style="background:#faf6ef;border-top:1px solid #e0d6c5;padding:16px 32px;font-size:11px;color:#4a3f3a;text-align:center">
      Enviado desde la intranet del Centro de Estudiantes · Sagrado Corazón Rosario
    </div>
  </div>
</body>
</html>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Centro de Estudiantes <noreply@sagradorosario.edu.ar>',
        to: adminEmails,
        reply_to: email,
        subject: `Postulación de ${nombre} — Quiero ayudar`,
        html: htmlBody,
      }),
    });

    return new Response(JSON.stringify({ ok: true, sent: adminEmails.length }), { headers: CORS });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

function escHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
