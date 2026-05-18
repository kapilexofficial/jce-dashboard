import { revalidateTag } from "next/cache";
import {
  requestMensagemCB,
  requestVeiculo,
  TCMessage,
  TCVehicle,
} from "@/lib/trucks-control-api";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_PAGES = 20;
const PAGE_DELAY_MS = 1000;
const SYNC_VEHICLES_KEY = "last_vehicles_sync";
const VEHICLES_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const MIN_SYNC_INTERVAL_MS = 60 * 1000; // 1min de throttle entre sincronizações

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

type SB = ReturnType<typeof supabaseAdmin>;

async function syncVehicles(sb: SB): Promise<{ count: number; error?: string }> {
  try {
    const vehicles = await requestVeiculo();
    if (vehicles.length === 0) return { count: 0 };

    const { error } = await sb
      .from("tc_vehicles")
      .upsert(vehicles.filter((v) => v.veiId).map(vehicleToRow), { onConflict: "vei_id" });

    if (error) return { count: 0, error: error.message };
    return { count: vehicles.length };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function shouldSyncVehicles(sb: SB): Promise<boolean> {
  const { data } = await sb
    .from("tc_sync_state")
    .select("value_timestamptz")
    .eq("key", SYNC_VEHICLES_KEY)
    .maybeSingle();
  if (!data?.value_timestamptz) return true;
  const last = new Date(data.value_timestamptz).getTime();
  return Date.now() - last > VEHICLES_SYNC_INTERVAL_MS;
}

async function recordVehiclesSync(sb: SB) {
  await sb.from("tc_sync_state").upsert(
    {
      key: SYNC_VEHICLES_KEY,
      value_timestamptz: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

async function getLastMld(sb: SB): Promise<{ mld: number; ts: string | null }> {
  const { data } = await sb
    .from("tc_sync_state")
    .select("value_bigint, value_timestamptz")
    .eq("key", "last_mld")
    .maybeSingle();
  return {
    mld: Number(data?.value_bigint ?? 1),
    ts: data?.value_timestamptz ?? null,
  };
}

async function setLastMld(sb: SB, mld: number) {
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
  sb: SB,
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

export interface SyncResult {
  ok: boolean;
  status: "ok" | "partial" | "error" | "throttled";
  messages_synced: number;
  vehicles_synced: number;
  pages_fetched: number;
  last_mld_before: number;
  last_mld_after: number;
  elapsed_ms: number;
  errors: string[];
}

export async function syncTrucksControl(
  opts: { respectThrottle?: boolean } = {}
): Promise<SyncResult> {
  const started = Date.now();
  const sb = supabaseAdmin();

  let lastMldBefore = 0;
  let lastMldAfter = 0;
  let messagesSynced = 0;
  let pagesFetched = 0;
  let vehiclesSynced = 0;
  const errors: string[] = [];

  try {
    const before = await getLastMld(sb);
    lastMldBefore = before.mld;

    // Throttle pra evitar chamadas redundantes (botão atualizar agora)
    if (opts.respectThrottle && before.ts) {
      const elapsed = Date.now() - new Date(before.ts).getTime();
      if (elapsed < MIN_SYNC_INTERVAL_MS) {
        return {
          ok: true,
          status: "throttled",
          messages_synced: 0,
          vehicles_synced: 0,
          pages_fetched: 0,
          last_mld_before: lastMldBefore,
          last_mld_after: lastMldBefore,
          elapsed_ms: Date.now() - started,
          errors: [`throttled: aguarde ${Math.ceil((MIN_SYNC_INTERVAL_MS - elapsed) / 1000)}s`],
        };
      }
    }

    let currentMld = lastMldBefore;

    for (let page = 0; page < MAX_PAGES; page++) {
      const messages = await requestMensagemCB(currentMld);
      pagesFetched++;

      if (messages.length === 0) break;

      const rows = messages.filter((m) => m.mld && m.veiId).map(messageToRow);
      if (rows.length > 0) {
        const { error } = await sb
          .from("tc_messages")
          .upsert(rows, { onConflict: "mld" });

        if (error) {
          errors.push(`upsert page ${page}: ${error.message}`);
          break;
        }
        messagesSynced += rows.length;
      }

      currentMld = Math.max(...messages.map((m) => m.mld).filter((n) => Number.isFinite(n)));

      if (messages.length < 30) break;

      if (PAGE_DELAY_MS > 0) await sleep(PAGE_DELAY_MS);
    }

    lastMldAfter = currentMld;
    if (lastMldAfter > lastMldBefore) {
      await setLastMld(sb, lastMldAfter);
    }

    if (await shouldSyncVehicles(sb)) {
      const r = await syncVehicles(sb);
      vehiclesSynced = r.count;
      if (r.error) errors.push(`vehicles: ${r.error}`);
      else await recordVehiclesSync(sb);
    }

    const status = errors.length === 0 ? "ok" : pagesFetched > 0 ? "partial" : "error";
    await setStatus(sb, status, errors[0]);

    revalidateTag("tc_km", { expire: 0 });
    revalidateTag("tc_vehicles", { expire: 0 });

    return {
      ok: errors.length === 0,
      status,
      messages_synced: messagesSynced,
      vehicles_synced: vehiclesSynced,
      pages_fetched: pagesFetched,
      last_mld_before: lastMldBefore,
      last_mld_after: lastMldAfter,
      elapsed_ms: Date.now() - started,
      errors,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`fatal: ${msg}`);
    try {
      await setStatus(sb, "error", msg);
    } catch {}
    return {
      ok: false,
      status: "error",
      messages_synced: messagesSynced,
      vehicles_synced: vehiclesSynced,
      pages_fetched: pagesFetched,
      last_mld_before: lastMldBefore,
      last_mld_after: lastMldAfter,
      elapsed_ms: Date.now() - started,
      errors,
    };
  }
}

export async function getLastSyncInfo(): Promise<{
  last_mld_at: string | null;
  status: string | null;
}> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("tc_sync_state")
      .select("key, value_text, value_timestamptz")
      .in("key", ["last_mld", "last_sync_status"]);
    const lastMld = data?.find((r) => r.key === "last_mld");
    const lastStatus = data?.find((r) => r.key === "last_sync_status");
    return {
      last_mld_at: lastMld?.value_timestamptz ?? null,
      status: lastStatus?.value_text ?? null,
    };
  } catch {
    return { last_mld_at: null, status: null };
  }
}
