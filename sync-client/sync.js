#!/usr/bin/env node
import 'dotenv/config';

const IOL_BASE = 'https://api.invertironline.com';

const {
  IOL_USERNAME,
  IOL_PASSWORD,
  FINTRACKER_API_URL,
  FINTRACKER_API_TOKEN,
} = process.env;

if (!IOL_USERNAME || !IOL_PASSWORD) {
  console.error('❌ Faltan IOL_USERNAME y IOL_PASSWORD en .env');
  process.exit(1);
}
if (!FINTRACKER_API_URL || !FINTRACKER_API_TOKEN) {
  console.error('❌ Faltan FINTRACKER_API_URL y FINTRACKER_API_TOKEN en .env');
  process.exit(1);
}

let cachedToken = null;
let cachedTokenExpires = null;

async function getToken() {
  if (cachedToken && cachedTokenExpires && cachedTokenExpires > Date.now() + 60_000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    username: IOL_USERNAME,
    password: IOL_PASSWORD,
    grant_type: 'password',
  }).toString();

  const res = await fetch(`${IOL_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`IOL token error ${res.status}: ${text || '(empty)'}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpires = new Date(data['.expires']).getTime();
  return cachedToken;
}

async function iolGet(path) {
  const token = await getToken();
  const res = await fetch(`${IOL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`IOL ${path} error ${res.status}: ${text || '(empty)'}`);
  }
  return res.json();
}

async function fetchPortfolio() {
  const positions = [];
  for (const country of ['argentina', 'estados_Unidos']) {
    try {
      const data = await iolGet(`/api/v2/portafolio/${country}`);
      for (const a of data.activos || []) {
        positions.push({
          country: data.pais,
          symbol: a.titulo.simbolo,
          description: a.titulo.descripcion ?? null,
          instrument_type: a.titulo.tipo ?? null,
          quantity: a.cantidad,
          last_price: a.ultimoPrecio ?? null,
          ppc: a.ppc ?? null,
          valuation: a.valorizado ?? null,
          profit_loss: a.gananciaDinero ?? null,
          profit_loss_percent: a.gananciaPorcentaje ?? null,
          currency: a.titulo.moneda ?? null,
        });
      }
    } catch (err) {
      console.warn(`⚠️  No se pudo traer portfolio ${country}:`, err.message);
    }
  }
  return positions;
}

async function fetchOperations(daysBack = 365) {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - daysBack);

  const params = new URLSearchParams({
    'filtro.estado': 'todas',
    'filtro.fechaDesde': from.toISOString().split('T')[0],
    'filtro.fechaHasta': today.toISOString().split('T')[0],
  });

  const ops = await iolGet(`/api/v2/operaciones?${params.toString()}`);
  return Array.isArray(ops) ? ops : [];
}

const DIVIDEND_KEYWORDS = ['dividendo', 'dividend', 'renta', 'cobro de cupon', 'cobro de cupón', 'cupon', 'cupón'];
function isDividend(type, desc) {
  const text = `${type || ''} ${desc || ''}`.toLowerCase();
  return DIVIDEND_KEYWORDS.some((k) => text.includes(k));
}

function normalizeOperation(op) {
  const date = (op.fechaOperada || op.fechaOrden || '').split('T')[0];
  return {
    iol_operation_id: op.numero,
    date,
    type: op.tipo,
    status: op.estado,
    symbol: op.simbolo ?? null,
    market: op.mercado ?? null,
    quantity: op.cantidadOperada ?? op.cantidad ?? null,
    price: op.precioOperado ?? op.precio ?? null,
    total: op.montoOperado ?? op.monto ?? null,
    currency: op.moneda ?? null,
    description: op.descripcion ?? null,
    raw: op,
  };
}

function extractSymbolFromDescription(desc) {
  if (!desc) return null;
  const match = desc.match(/([A-Z]{2,6}\d?)/g);
  if (match && match.length > 0) {
    const candidates = match.filter((m) => !['IOL', 'BCBA', 'NYSE', 'USD', 'ARS'].includes(m));
    return candidates[0] || null;
  }
  return null;
}

function normalizeDividend(op) {
  const date = (op.fechaOperada || op.fechaOrden || '').split('T')[0];
  const symbol = op.simbolo || extractSymbolFromDescription(op.descripcion) || extractSymbolFromDescription(op.tipo);
  return {
    iol_movement_id: op.numero,
    date,
    symbol: symbol ?? null,
    type: op.tipo ?? null,
    amount: Number(op.montoOperado || op.monto || 0),
    currency: op.moneda ?? null,
    description: op.descripcion ?? null,
    raw: op,
  };
}

async function pushToFinTracker(payload) {
  const url = `${FINTRACKER_API_URL.replace(/\/$/, '')}/api/iol/ingest`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FINTRACKER_API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`FinTracker ingest error ${res.status}: ${text || '(empty)'}`);
  }

  return res.json();
}

async function syncOnce() {
  const startedAt = new Date();
  console.log(`\n⏳ ${startedAt.toLocaleString('es-AR')} - Iniciando sincronización...`);

  const positions = await fetchPortfolio();
  console.log(`   📊 Portfolio: ${positions.length} posiciones`);

  const allOps = await fetchOperations(365);
  const operations = [];
  const dividends = [];

  for (const op of allOps) {
    if (!op.numero) continue;
    if (isDividend(op.tipo, op.descripcion)) {
      dividends.push(normalizeDividend(op));
    } else {
      operations.push(normalizeOperation(op));
    }
  }

  console.log(`   💱 Operaciones: ${operations.length}`);
  console.log(`   💰 Dividendos: ${dividends.length}`);

  const result = await pushToFinTracker({
    username: IOL_USERNAME,
    positions,
    operations,
    dividends,
  });

  console.log(`✅ Sincronización completada:`);
  console.log(`   - Posiciones cargadas: ${result.portfolio_count}`);
  console.log(`   - Operaciones nuevas: ${result.operations_imported}`);
  console.log(`   - Inversiones auto-creadas: ${result.auto_created_investments}`);
  console.log(`   - Dividendos importados: ${result.dividends_imported}`);
}

async function main() {
  const watch = process.argv.includes('--watch');

  try {
    await syncOnce();
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (!watch) process.exit(1);
  }

  if (watch) {
    const intervalMs = 60 * 60 * 1000; // 1 hour
    console.log(`\n👀 Modo watch activado. Próxima sincronización en 1 hora...`);
    setInterval(async () => {
      try {
        await syncOnce();
      } catch (err) {
        console.error('❌ Error en sync periódica:', err.message);
      }
    }, intervalMs);
  }
}

main();
