# leescubrelo.mx

Sitio estático de Leescúbrelo, S.A.P.I. de C.V. Se publica en Cloudflare Pages: cada push a `main` se despliega solo.

- Páginas: HTML plano en la raíz; las URLs sin `.html` las resuelve Cloudflare Pages.
- Estilos: `assets/css/sitio.css`. Imágenes: `assets/img/`.
- Formulario «Súmate»: `functions/api/aliados.js` (Pages Function). Requiere el binding KV `ALIADOS`; aviso por correo opcional con `RESEND_API_KEY` y `AVISO_DESTINO`.
- `robots.txt`, `sitemap.xml`, `_headers`, `_redirects` y la key de IndexNow viven en la raíz.

Configuración de Cloudflare Pages: framework **None**, build command vacío, output directory `/`.
