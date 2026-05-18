import { unzipSync, gunzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";

const BASE_URL =
  process.env.TRUCKS_CONTROL_BASE_URL ||
  "https://webservice.newrastreamentoonline.com.br";
const LOGIN = process.env.TRUCKS_CONTROL_LOGIN || "";
const PASSWORD = process.env.TRUCKS_CONTROL_PASSWORD || "";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
});

function escapeXml(s: string): string {
  return s.replace(
    /[<>&'"]/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)
  );
}

function decompress(data: Uint8Array): string {
  // ZIP (PKZIP archive): 50 4B 03 04
  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b) {
    const files = unzipSync(data);
    const entries = Object.entries(files);
    if (entries.length === 0) throw new Error("Trucks Control: zip response empty");
    return strFromU8(entries[0][1]);
  }
  // GZIP: 1F 8B
  if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
    return strFromU8(gunzipSync(data));
  }
  // Não comprimido (ex: erros HTTP em texto puro)
  return strFromU8(data);
}

async function post(xml: string): Promise<string> {
  if (!LOGIN || !PASSWORD) {
    throw new Error("Trucks Control: TRUCKS_CONTROL_LOGIN/PASSWORD ausentes");
  }
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: xml,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Trucks Control HTTP ${res.status} ${res.statusText}: ${body.slice(0, 200)}`
    );
  }
  const ab = await res.arrayBuffer();
  if (!ab || ab.byteLength === 0) {
    throw new Error(`Trucks Control: resposta vazia (Content-Length=${res.headers.get("content-length") ?? "?"})`);
  }
  let buf: Uint8Array;
  try {
    buf = new Uint8Array(ab);
  } catch (e) {
    throw new Error(
      `Trucks Control: falha allocando Uint8Array (byteLength=${ab.byteLength}): ${e instanceof Error ? e.message : e}`
    );
  }
  try {
    return decompress(buf);
  } catch (e) {
    const head = [...buf.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    throw new Error(
      `Trucks Control: decompress falhou (len=${buf.length}, head=[${head}]): ${e instanceof Error ? e.message : e}`
    );
  }
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

// =========================
// Tipos
// =========================

export interface TCMessage {
  mld: number;
  veiId: number;
  dt: string;
  dtInc: string | null;
  lat: number | null;
  lon: number | null;
  mun: string | null;
  uf: string | null;
  rod: string | null;
  rua: string | null;
  vel: number | null;
  odm: number | null; // odômetro km — fonte para KM rodado
  rpm: number | null;
  lt: number | null;
  evt4: number | null; // ignição: -1/0/1
  evtG: number | null;
  ori: number | null;
  tpMsg: number | null;
  dMac: string | null;
  tfrId: number | null;
  mot: string | null;
  motId: number | null;
  carreta: string | null;
  st1: number | null;
  st2: number | null;
  st3: number | null;
  umd1: number | null;
  umd2: number | null;
  umd3: number | null;
  events: Record<string, boolean>;
  raw: Record<string, unknown>;
}

export interface TCVehicle {
  veiId: number;
  placa: string;
  ident: string | null;
  vs: string | null;
  eqp: number;
  vManut: boolean;
  raw: Record<string, unknown>;
}

// =========================
// RequestMensagemCB — posições/eventos/telemetria
// =========================

export async function requestMensagemCB(lastMld: number = 1): Promise<TCMessage[]> {
  const xml =
    `<RequestMensagemCB>` +
    `<login>${escapeXml(LOGIN)}</login>` +
    `<senha>${escapeXml(PASSWORD)}</senha>` +
    `<mId>${Math.max(1, lastMld)}</mId>` +
    `</RequestMensagemCB>`;

  const text = await post(xml);
  const parsed = parser.parse(text);
  const root = parsed?.ResponseMensagemCB;
  if (!root) return [];

  const raws = asArray<Record<string, unknown>>(
    root.MensagemCB as Record<string, unknown> | Record<string, unknown>[] | undefined
  );

  return raws.map((m) => {
    const events: Record<string, boolean> = {};
    for (const k of Object.keys(m)) {
      if (k.startsWith("evt") && k !== "evtG" && k !== "evt4") {
        const v = m[k];
        if (v === true || v === "true" || v === 1 || v === "1") {
          events[k] = true;
        }
      }
    }
    return {
      mld: Number(m.mId),
      veiId: Number(m.veiID),
      dt: String(m.dt ?? ""),
      dtInc: toStr(m.dtInc),
      lat: toNum(m.lat),
      lon: toNum(m.lon),
      mun: toStr(m.mun),
      uf: toStr(m.uf),
      rod: toStr(m.rod),
      rua: toStr(m.rua),
      vel: toNum(m.vel),
      odm: toNum(m.odm),
      rpm: toNum(m.rpm),
      lt: toNum(m.lt),
      evt4: toNum(m.evt4),
      evtG: toNum(m.evtG),
      ori: toNum(m.ori),
      tpMsg: toNum(m.tpMsg),
      dMac: toStr(m.dMac),
      tfrId: toNum(m.tfrID),
      mot: toStr(m.mot),
      motId: toNum(m.motID),
      carreta: toStr(m.carreta),
      st1: toNum(m.st1),
      st2: toNum(m.st2),
      st3: toNum(m.st3),
      umd1: toNum(m.umd1),
      umd2: toNum(m.umd2),
      umd3: toNum(m.umd3),
      events,
      raw: m,
    };
  });
}

// =========================
// RequestVeiculo — cadastro de veículos
// =========================

export async function requestVeiculo(alteradosOnly = false): Promise<TCVehicle[]> {
  const xml =
    `<RequestVeiculo>` +
    `<login>${escapeXml(LOGIN)}</login>` +
    `<senha>${escapeXml(PASSWORD)}</senha>` +
    (alteradosOnly ? `<alterados>1</alterados>` : "") +
    `</RequestVeiculo>`;

  const text = await post(xml);
  const parsed = parser.parse(text);
  const root = parsed?.ResponseVeiculo;
  if (!root) return [];

  const raws = asArray<Record<string, unknown>>(
    root.Veiculo as Record<string, unknown> | Record<string, unknown>[] | undefined
  );

  return raws.map((v) => ({
    veiId: Number(v.veiID),
    placa: String(v.placa ?? ""),
    ident: toStr(v.ident),
    vs: toStr(v.vs),
    eqp: Number(v.eqp ?? 0),
    vManut: Number(v.vManut ?? 0) === 1,
    raw: v,
  }));
}

// =========================
// Catálogo de eventos (mapping legível dos evts numerados)
// =========================
// Subset mais relevante; lista completa na doc Trucks Control pgs 81-86
export const EVENT_LABELS: Record<string, string> = {
  evt1: "Buser/Alerta cabine",
  evt2: "Sirene acionada",
  evt3: "Veículo bloqueado",
  evt5: "Botão de pânico",
  evt6: "Aviso cabine",
  evt8: "Desengate carreta 1",
  evt9: "Trava 5ª roda",
  evt10: "Trava baú destravada",
  evt11: "Pisca alerta",
  evt12: "Porta carona aberta",
  evt13: "Porta motorista aberta",
  evt14: "Porta baú aberta",
  evt16: "Bateria violada",
  evt17: "Cabo velocímetro violado",
  evt27: "Desengate carreta 2",
  evt28: "Violação painel",
  evt31: "Pânico escondido",
  evt34: "Velocidade máx excedida (GPS)",
  evt35: "RPM máximo ultrapassado",
  evt67: "Evento de telemetria",
  evt72: "Velocidade excedida tacógrafo",
  evt78: "Porta cofre aberta",
  evt86: "Movimento sem GPS",
  evt87: "Tempo excessivo porta motorista",
  evt88: "Tempo excessivo porta carona",
  evt95: "Pânico/Violação painel",
  evt99: "Perda de vídeo",
  evt100: "Movimento indevido câmera",
  evt101: "Cobertura câmera",
  evt104: "Desligamento ilegal",
  evt105: "Fadiga do motorista",
  evt106: "Motorista não detectado",
  evt107: "Possível uso de celular",
  evt108: "Possível uso de cigarro",
  evt109: "Distração do motorista",
  evt110: "Risco de colisão frontal",
  evt112: "Distância insegura",
  evt113: "Bocejo",
  evt114: "Cinto de segurança",
  evt115: "Abertura porta motorista não autorizada",
  evt117: "Vínculo carreta",
  evt118: "Desvínculo carreta",
};

export function eventLabel(evtKey: string): string {
  return EVENT_LABELS[evtKey] || evtKey;
}
