import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  requestMensagemCB,
  requestVeiculo,
  TCMessage,
  TCVehicle,
} from "@/lib/trucks-control-api";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5min (Vercel hobby limit é 60s, pro 300s)

const MAX_PAGES = 20; // teto de paginação por execução — máx 600 msgs / call
const PAGE_DELAY_MS = 1000; // pausa entre chamadas paginadas (rate limit Trucks Control = 30s "oficial")
const SYNC_VEHICLES_KEY = "last_vehicles_sync";
const VEHICLES_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageToRow(m: TCMessage) {
  return {
    mld: m.mld,
    vei_id: m.veiId,
    dt: m.dt,
    dt_inc: m.dtInc,
    lat: m.lat,
    lon: m.lon,
    mun: m.mun,
    uf: m.uf,
    rod: m.rod,
    rua: m.rua,
    vel: m.vel,
    odm: m.odm,
    rpm: m.rpm,
    lt: m.lt,
    evt4: m.evt4,
    evt_g: m.evtG,
    ori: m.ori,
    tp_msg: m.tpMsg,
    d_mac: m.dMac,
    tfr_id: m.tfrId,
    mot: m.mot,
    mot_id: m.motId,
    carreta: m.carreta,
    st1: m.st1,
    st2: m.st2,
    st3: m.st3,
    umd1: m.umd1,
    umd2: m.umd2,
    umd3: m.umd3,
    events: m.events,
    raw: m.raw,
  };
}

function vehicleToRow(v: TCVehicle) {
  return {
    vei_id: v.veiId,
    placa: v.placa,
    ident: v.ident,
    vs: v.vs,
    eqp: v.eqp,
    v_manut: v.vManut,
    raw: v.raw,
    updated_at: new Date().toISOString(),
  };
}

async function syncVehicles(): Promise<{ count: number; error?: string }> {
  try {
    const vehicles = await requestVeiculo();
    if (vehicles.length === 0) return { count: 0 };

    const sb = supabaseAdmin();
    const { error } = await sb
      .from("tc_vehicles")
      .upsert(vehicles.map(vehicleToRow), { onConflict: "vei_id" });

    if (error) return { count: 0, error: error.message };
    return { count: vehicles.length };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function shouldSyncVehicles(sb: ReturnType<typeof supabaseAdmin>): Promise<boolean> {
  const { data } = await sb
    .from("tc_sync_state")
    .select("value_timestamptz")
    .eq("key", SYNC_VEHICLES_KEY)
    .maybeSingle();
  if (!data?.value_timestamptz) return true;
  const last = new Date(data.value_timestamptz).getTime();
  return Date.now() - last > VEHICLES_SYNC_INTERVAL_MS;
}

async function recordVehiclesSync(sb: ReturnType<typeof supabaseAdmin>) {
  await sb.from("tc_sync_state").upsert(
    {
      key: SYNC_VEHICLES_KEY,
      value_timestamptz: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

async function getLastMld(sb: ReturnType<typeof supabaseAdmin>): Promise<number> {
  const { data } = await sb
    .from("tc_sync_state")
    .select("value_bigint")
    .eq("key", "last_mld")
    .maybeSingle();
  return Number(data?.value_bigint ?? 1);
}

async function setLastMld(sb: ReturnType<typeof supabaseAdmin>, mld: number) {
  await sb.from("tc_sync_state").upsert(
    {
      key: "last_mld",
      value_bigint: mld,
      value_timestamptz: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

async function setStatus(
  sb: ReturnType<typeof supabaseAdmin>,
  status: "ok" | "partial" | "error",
  detail?: string
) {
  await sb.from("tc_sync_state").upsert(
    {
      key: "last_sync_status",
      value_text: detail ? `${status}: ${detail}` : status,
      value_timestamptz: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

async function runSync() {
  const started = Date.now();
  const sb = supabaseAdmin();

  let lastMldBefore = 0;
  let lastMldAfter = 0;
  let messagesSynced = 0;
  let pagesFetched = 0;
  let vehiclesSynced = 0;
  const errors: string[] = [];

  try {
    lastMldBefore = await getLastMld(sb);
    let currentMld = lastMldBefore;

    // Drain mensagens paginando até esgotar ou bater teto
    for (let page = 0; page < MAX_PAGES; page++) {
      const messages = await requestMensagemCB(currentMld);
      pagesFetched++;

      if (messages.length === 0) break;

      const rows = messages.map(messageToRow);
      const { error } = await sb
        .from("tc_messages")
        .upsert(rows, { onConflict: "mld" });

      if (error) {
        errors.push(`upsert page ${page}: ${error.message}`);
        break;
      }

      messagesSynced += messages.length;
      currentMld = Math.max(...messages.map((m) => m.mld));

      // Se veio menos que ~30, provavelmente esgotou
      if (messages.length < 30) break;

      if (PAGE_DELAY_MS > 0) await sleep(PAGE_DELAY_MS);
    }

    lastMldAfter = currentMld;
    if (lastMldAfter > lastMldBefore) {
      await setLastMld(sb, lastMldAfter);
    }

    // Sincronizar cadastro de veículos (esporadicamente — 6h)
    if (await shouldSyncVehicles(sb)) {
      const r = await syncVehicles();
      vehiclesSynced = r.count;
      if (r.error) errors.push(`vehicles: ${r.error}`);
      if (!r.error) await recordVehiclesSync(sb);
    }

    const status = errors.length === 0 ? "ok" : pagesFetched > 0 ? "partial" : "error";
    await setStatus(sb, status, errors[0]);

    // Invalida caches de páginas que dependem do KM Trucks Control
    revalidateTag("tc_km", { expire: 0 });
    revalidateTag("tc_vehicles", { expire: 0 });

    return NextResponse.json({
      ok: errors.length === 0,
      status,
      messages_synced: messagesSynced,
      vehicles_synced: vehiclesSynced,
      pages_fetched: pagesFetched,
      last_mld_before: lastMldBefore,
      last_mld_after: lastMldAfter,
      elapsed_ms: Date.now() - started,
      errors,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`fatal: ${msg}`);
    try {
      await setStatus(sb, "error", msg);
    } catch {}
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        messages_synced: messagesSynced,
        vehicles_synced: vehiclesSynced,
        pages_fetched: pagesFetched,
        last_mld_before: lastMldBefore,
        last_mld_after: lastMldAfter,
        elapsed_ms: Date.now() - started,
        errors,
      },
      { status: 500 }
    );
  }
}

function authorize(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET || "";
  if (!expected) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const provided =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const denial = authorize(req);
  if (denial) return denial;
  return runSync();
}

// GET permitido pra debug com curl (mesmo header obrigatório)
export async function GET(req: NextRequest) {
  const denial = authorize(req);
  if (denial) return denial;
  return runSync();
}
