/* ── Quiero ayudar — modal de postulación ── */
(function () {

  const MODAL_HTML = `
<div id="modal-colaborar" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="colab-title">
  <div class="modal" style="max-width:520px">
    <button class="modal-close" onclick="cerrarColaborar()" aria-label="Cerrar">×</button>
    <h2 id="colab-title">Quiero ayudar</h2>
    <p class="modal-sub">¿Tenés ganas de sumarte al Centro de Estudiantes? Completá este formulario y nos ponemos en contacto.</p>

    <div id="colab-alert" style="display:none;padding:12px 14px;border-radius:10px;font-size:13px;margin-bottom:16px"></div>

    <div class="form-group">
      <label>Tu nombre</label>
      <input type="text" id="colab-nombre" placeholder="María García" maxlength="80">
    </div>
    <div class="form-group">
      <label>Tu email</label>
      <input type="email" id="colab-email" placeholder="tu@email.com">
    </div>
    <div class="form-group">
      <label>¿En qué área querés colaborar?</label>
      <select id="colab-comision">
        <option value="">— seleccioná —</option>
        <option>Comunicación y redes</option>
        <option>Eventos y actividades</option>
        <option>Convivencia y bienestar</option>
        <option>Deporte</option>
        <option>Cultura y arte</option>
        <option>Tecnología</option>
        <option>Varios / lo que haga falta</option>
      </select>
    </div>
    <div class="form-group">
      <label>¿Por qué querés participar?</label>
      <textarea id="colab-mensaje" rows="4" maxlength="800"
        placeholder="Contanos algo sobre vos, qué te interesa hacer, o cómo podés aportar..."></textarea>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
      <button class="btn btn-primary" id="colab-btn-enviar" onclick="enviarColaborar()" style="flex:1;justify-content:center">Enviar postulación</button>
      <button class="btn btn-ghost" onclick="cerrarColaborar()">Cancelar</button>
    </div>
  </div>
</div>`;

  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', MODAL_HTML);

    document.getElementById('modal-colaborar').addEventListener('click', function(e) {
      if (e.target === this) cerrarColaborar();
    });

    document.querySelectorAll('[data-action="colaborar"]').forEach(a => {
      a.addEventListener('click', e => { e.preventDefault(); abrirColaborar(); });
    });
  });

})();

function abrirColaborar() {
  const m = document.getElementById('modal-colaborar');
  if (!m) return;
  document.getElementById('colab-nombre').value  = '';
  document.getElementById('colab-email').value   = '';
  document.getElementById('colab-comision').value = '';
  document.getElementById('colab-mensaje').value = '';
  document.getElementById('colab-alert').style.display = 'none';
  const btn = document.getElementById('colab-btn-enviar');
  btn.disabled = false;
  btn.textContent = 'Enviar postulación';
  m.classList.add('open');
  setTimeout(() => document.getElementById('colab-nombre').focus(), 60);
}

function cerrarColaborar() {
  document.getElementById('modal-colaborar')?.classList.remove('open');
}

async function enviarColaborar() {
  const nombre   = document.getElementById('colab-nombre').value.trim();
  const email    = document.getElementById('colab-email').value.trim();
  const comision = document.getElementById('colab-comision').value;
  const mensaje  = document.getElementById('colab-mensaje').value.trim();
  const alertEl  = document.getElementById('colab-alert');
  const btn      = document.getElementById('colab-btn-enviar');

  function showAlert(msg, ok) {
    alertEl.textContent = msg;
    alertEl.style.display = 'block';
    alertEl.style.background = ok ? '#d8ecdc' : '#fad6cd';
    alertEl.style.color      = ok ? '#2d6a3e' : '#a73a1f';
  }

  if (!nombre || !email || !mensaje) {
    showAlert('Completá nombre, email y el mensaje antes de enviar.', false);
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlert('El email no parece válido.', false);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const r = await fetch(window.SUPABASE_URL + '/functions/v1/colaborar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ nombre, email, comision, mensaje }),
    });
    if (!r.ok) throw new Error('Error ' + r.status);
    showAlert('¡Gracias! Tu postulación fue enviada. Te vamos a contactar pronto.', true);
    btn.textContent = '✓ Enviado';
  } catch {
    showAlert('Hubo un error al enviar. Intentá de nuevo o escribinos directo.', false);
    btn.disabled = false;
    btn.textContent = 'Enviar postulación';
  }
}
