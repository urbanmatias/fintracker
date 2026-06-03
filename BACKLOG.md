# Backlog FinTracker

Roadmap de features pendientes y mejoras. Marcá con `[x]` cuando estén hechas.

---

## 🔒 Seguridad

> Importante antes de abrir la app a otros usuarios.

- [ ] Setear `ENCRYPTION_KEY` distinta del `JWT_SECRET` en Railway
- [ ] Activar 2FA en cuenta de IOL desde la web de IOL
- [ ] **Modo "no guardar pass IOL"**: opción para guardar solo tokens y pedir pass cuando expiran (fricción a cambio de menos riesgo)
- [ ] **Botón "borrar credenciales IOL"** sin perder el histórico ya sincronizado
- [ ] **2FA TOTP en login de FinTracker** (Google Authenticator)
- [ ] **Recuperación de contraseña por email** (con SendGrid o Resend)
- [ ] **Cambio de contraseña** desde Settings
- [ ] **Eliminar cuenta** (con confirmación, borra todo en cascade)
- [ ] **Auditar logs** para que nunca impriman datos sensibles
- [ ] **Rate limiting** en endpoints de auth y de IOL para evitar brute force
- [ ] **KMS externo** (AWS KMS / GCP KMS) cuando salga al mercado, para que la clave de cifrado no viva en el mismo servicio
- [ ] **Backups automáticos verificados** del PostgreSQL en Railway
- [ ] **Endpoint de export** para bajar todos los datos en JSON/CSV (respaldo manual)

---

## 💸 Gastos y flujo diario

- [ ] **Gastos en cuotas**: cargar un gasto en N cuotas y se distribuye en los próximos meses
- [ ] **Gastos compartidos** (split): dividir un gasto con alguien y trackear quién debe a quién
- [ ] **Importar gastos desde CSV/Excel** (extracto del banco)
- [ ] **Reglas de auto-categorización**: si la descripción contiene "uber" → Transporte
- [ ] **OCR de tickets**: foto de factura → extrae monto + comercio (Google Vision o Claude)
- [x] **Comando rápido con parser**: escribir "almuerzo 2500 #urgente" y parsear todo
- [ ] **Búsqueda global** con Cmd+K (busca gastos, ir a páginas)
- [x] **Atajos de teclado** en desktop (n = nuevo gasto, etc)
- [ ] **Voice input**: dictar gasto al celu y que se cargue
- [ ] **Cancelar acción con Undo toast** en vez de confirm dialog ("Gasto eliminado [Deshacer]")

---

## 🎯 Metas y motivación

- [ ] **Metas por categoría**: "no gastar más de $X en bares este mes" con barra de progreso
- [ ] **Meta de excedente**: "quiero llegar a $1M para diciembre" + proyección
- [ ] **Streak gamificado**: días positivos seguidos con badges (5, 10, 30, 100)
- [ ] **Logros compartibles**: imagen pre-armada para Instagram cuando cerraste el mes en positivo
- [ ] **Recap mensual estilo Spotify Wrapped**: pantalla cinematográfica el día 1 con highlights

---

## 🧠 Inteligencia y predicción

- [x] **Forecast del mes**: "si seguís así terminás con $X de excedente"
- [ ] **Detección de subscripciones olvidadas**: cargos recurrentes con misma descripción no marcados como gasto fijo
- [ ] **Alertas de overspend visuales** en el dashboard
- [x] **Anomalías**: "hoy gastaste 3x tu promedio" (ya hay algo básico, mejorar)

---

## 💱 Multi-moneda y dólar

- [ ] **Toggle global "ver todo en USD"** usando MEP/CCL automático
- [ ] **Cargar gasto en USD** y que la app convierta al CCL del día
- [ ] **Widget dólar MEP/CCL en vivo** en el dashboard (usando IOL)

---

## 📈 Inversiones (IOL)

- [ ] **Operar desde la app**: usar `/api/v2/operar/Comprar` para mandar órdenes
- [ ] **Cron job diario** para snapshot del portfolio sin tener que abrir la app
- [ ] **Watchlist**: lista de tickers favoritos sin tener que buscarlos cada vez
- [ ] **Alertas de precio**: "avisame cuando AAPL baje a $200"
- [ ] **Comparación entre tickers**: chart con varios símbolos overlapeados
- [ ] **Calculadora de DCA** (Dollar Cost Averaging): si invertís X mensual durante Y años
- [ ] **Análisis de comisiones**: cuánto gastaste en comisiones de IOL

---

## 👤 UX y onboarding

- [x] **Onboarding wizard** al primer login (3 pasos: ingreso → gastos fijos → distribución)
- [ ] **Tour guiado** de las features para usuarios nuevos
- [x] **Modo claro / oscuro toggle** además del dark actual
- [ ] **Modo OLED** verdadero negro `#000` para ahorro de batería en mobile
- [ ] **Modo compacto** para usuarios power
- [x] **Pull to refresh** en mobile con animación custom
- [x] **Swipe to delete/edit** en lista de gastos
- [x] **Haptic feedback** en mobile (Vibration API)
- [x] **Skeleton loaders** en todas las páginas (algunos ya están)
- [x] **Optimistic UI**: gasto aparece instantáneo aunque la red tarde

---

## 👥 Multi-usuario

- [ ] **Cuenta compartida** (pareja): dos usuarios mismo presupuesto
- [ ] **Modo split**: cada gasto puede ser personal o compartido

---

## 💼 Comercial / monetización

- [ ] **Landing page real** con copy persuasivo y screenshots
- [ ] **Naming**: cambiar "FinTracker" por algo más identitario (Mate, Pluma, Verde, Caja...)
- [ ] **Plan free vs pro**: limitar features en free (ej: 1 mes histórico, sin IOL)
- [ ] **Email de resumen mensual** automático el día 1
- [ ] **Export PDF mensual** profesional
- [ ] **Política de privacidad y términos** (legal mínimo)

---

## 🐛 Mejoras técnicas

- [ ] **Code splitting**: el bundle pesa 800KB+, dividir por ruta con `React.lazy`
- [ ] **Tests** (Jest/Vitest) en endpoints críticos del backend
- [ ] **Error tracking** (Sentry o similar)
- [ ] **CI/CD**: tests automáticos al hacer push
- [ ] **Logs estructurados** (Pino) en vez de morgan
- [ ] **Migrar a server-side rendering** o pre-rendering si SEO importa

---

## 📝 Notas

Esto se actualiza a medida que pensamos cosas nuevas. Tachá con `[x]` lo que se va terminando.
