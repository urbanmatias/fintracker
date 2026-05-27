# FinTracker 💰

App web para trackear finanzas personales. Calculá tu presupuesto diario, registrá gastos, y distribuí automáticamente lo que ahorrás entre inversión y cuenta.

## Features

- **Presupuesto diario automático**: (Ingreso - Gastos fijos) / días del mes
- **Regla de distribución configurable**: Elegí qué % va a inversión y qué % queda en cuenta
- **Gastos fijos**: Alquiler, servicios, suscripciones
- **Gastos diarios**: Registrá cada gasto con categoría
- **Estadísticas**: Gráficos por mes, por categoría, tendencias
- **Panel admin**: Gestión de usuarios y métricas de la plataforma
- **Cuentas de usuario**: Registro, login, roles

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: PostgreSQL + Knex.js
- **Auth**: JWT + bcrypt

## Setup local

### Requisitos
- Node.js 20+
- PostgreSQL

### Instalación

```bash
# Frontend
cd client && npm install

# Backend
cd server && npm install
```

### Configuración

Crear `server/.env`:

```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/finanzas
JWT_SECRET=tu-secret-key-super-segura
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Migraciones

```bash
cd server && npm run migrate
```

### Seed (usuario admin)

```bash
cd server && npm run seed
# Admin: admin@fintracker.com / admin123
```

### Desarrollo

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

## Deploy en Railway

1. Crear proyecto en Railway
2. Agregar servicio PostgreSQL
3. Conectar repo de GitHub
4. Configurar variables de entorno:
   - `DATABASE_URL` (se autocompleta con el plugin de PostgreSQL)
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `PORT=3001`
5. Railway detecta el `nixpacks.toml` y buildea automáticamente

## Estructura

```
├── client/          # React frontend
│   └── src/
│       ├── api/         # Axios client
│       ├── components/  # Layout, ProtectedRoute
│       ├── context/     # AuthContext
│       └── pages/       # Dashboard, Expenses, Stats, Settings, Admin
├── server/          # Express backend
│   └── src/
│       ├── database/    # Knex config, migrations, seeds
│       ├── middleware/  # Auth middleware
│       └── routes/      # API routes
└── nixpacks.toml    # Railway build config
```
