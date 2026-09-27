// Cloudflare Pages Function: recibe el formulario «Súmate» (POST /api/aliados).
// Bindings esperados (configurar en Cloudflare Pages → Settings → Functions):
//   ALIADOS         KV namespace donde se guarda cada propuesta (obligatorio)
//   RESEND_API_KEY  (opcional) llave de Resend para avisar por correo
//   AVISO_DESTINO   (opcional) correo que recibe el aviso, p. ej. contacto@leescubrelo.mx
//   AVISO_REMITENTE (opcional) remitente verificado en Resend, p. ej. avisos@leescubrelo.mx

const TIPOS = new Set([
  'Mi escuela quiere participar en una convocatoria',
  'Mi empresa quiere patrocinar o ser aliada',
  'Fundación u organización civil',
  'Gobierno o institución pública',
  'Quiero ser voluntario, jurado o mentor',
  'Quiero colaborar en Sin Minuta',
  'Quiero un ejemplar de El Estudio',
  'Medios y prensa',
  'Otra',
]);

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const limpio = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if ((request.headers.get('content-length') | 0) > 20000) return json({ ok: false, error: 'demasiado-grande' }, 413);
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'formato' }, 400); }

  if (d.sitio_web) return json({ ok: true }); // campo trampa: bots

  const p = {
    nombre: limpio(d.nombre, 120),
    organizacion: limpio(d.organizacion, 160),
    correo: limpio(d.correo, 160),
    telefono: limpio(d.telefono, 40),
    tipo: limpio(d.tipo, 80),
    mensaje: String(d.mensaje ?? '').trim().slice(0, 4000),
    acepto_aviso: d.acepto === 'on' || d.acepto === true,
    recibido: new Date().toISOString(),
    pais: request.cf?.country || '',
  };

  if (!p.nombre || !p.mensaje || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo) || !TIPOS.has(p.tipo) || !p.acepto_aviso) {
    return json({ ok: false, error: 'datos-incompletos' }, 422);
  }
  if (!env.ALIADOS) return json({ ok: false, error: 'sin-almacenamiento' }, 500);

  const id = `propuesta:${p.recibido}:${crypto.randomUUID().slice(0, 8)}`;
  await env.ALIADOS.put(id, JSON.stringify(p));

  if (env.RESEND_API_KEY && env.AVISO_DESTINO) {
    const cuerpo = [
      `Nueva propuesta desde leescubrelo.mx`, ``,
      `Nombre: ${p.nombre}`, `Organización: ${p.organizacion || '—'}`, `Correo: ${p.correo}`,
      `Teléfono: ${p.telefono || '—'}`, `Tipo: ${p.tipo}`, ``, p.mensaje, ``, `Registro: ${id}`,
    ].join('\n');
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: env.AVISO_REMITENTE || 'Leescúbrelo <avisos@leescubrelo.mx>',
          to: [env.AVISO_DESTINO], reply_to: p.correo,
          subject: `Súmate: ${p.tipo} — ${p.nombre}`, text: cuerpo,
        }),
      });
    } catch (e) { /* la propuesta ya quedó guardada en KV */ }
  }
  return json({ ok: true });
}

export const onRequest = () => json({ ok: false, error: 'metodo' }, 405);
