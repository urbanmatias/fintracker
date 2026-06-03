# FinTracker IOL Sync Client

Cliente local que se conecta a IOL desde tu PC (IP residencial) y manda los datos a tu app FinTracker hosteada en Railway.

## ¿Por qué?

IOL bloquea con CAPTCHA todas las requests que vienen de cloud providers (Railway, AWS, Google Cloud) usando AWS WAF. Como tu PC tiene IP residencial, IOL no la bloquea.

## Instalación

```bash
cd sync-client
npm install
cp .env.example .env
```

Editá `.env` con:

- `IOL_USERNAME` y `IOL_PASSWORD`: tu usuario y contraseña de IOL
- `FINTRACKER_API_URL`: la URL pública de tu FinTracker (ej: `https://fintracker-production-xxxx.up.railway.app`)
- `FINTRACKER_API_TOKEN`: token que generaste en la pantalla **Inversiones → Conectar IOL** de tu FinTracker

## Uso

**Sincronizar una vez:**

```bash
npm start
```

**Modo watch (sincroniza cada 1 hora):**

```bash
npm run watch
```

## Lo que sincroniza

- 📊 **Portfolio** completo (Argentina + Estados Unidos)
- 💱 **Operaciones** del último año (compras, ventas)
- 💰 **Dividendos** detectados (filtrando por tipo/descripción)

Las **compras** se registran automáticamente como inversiones en FinTracker. Los **dividendos** aparecen en su panel correspondiente.

## Seguridad

- Tu usuario y contraseña de IOL **nunca salen de tu PC**
- El token de API solo da permiso de **escribir datos en tu cuenta de FinTracker** (no acceder a IOL)
- El `.env` está en `.gitignore`. Nunca lo subas a git.

## Programar ejecución automática

### Windows (Task Scheduler)

1. Abrí "Programador de tareas"
2. Crear tarea básica
3. Desencadenador: cada hora (o el intervalo que prefieras)
4. Acción: iniciar programa
   - Programa: `node`
   - Argumentos: `sync.js`
   - Iniciar en: ruta a tu carpeta `sync-client`

### macOS / Linux (cron)

```bash
crontab -e
```

Agregar:

```
0 */1 * * * cd /ruta/a/sync-client && /usr/bin/node sync.js >> sync.log 2>&1
```
