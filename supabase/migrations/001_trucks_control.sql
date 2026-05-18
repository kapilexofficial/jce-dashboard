-- 001_trucks_control.sql
-- Schema inicial para sincronização Trucks Control → Supabase.
-- Rodar manualmente no SQL Editor do projeto JCE Frota.

-- Veículos espelhados na conta Trucks Control (vem de RequestVeiculo)
create table if not exists tc_vehicles (
  vei_id integer primary key,                      -- veilID
  placa text,
  ident text,                                      -- apelido cadastrado no Enterprise
  vs text,                                         -- versão computador de bordo
  eqp smallint,                                    -- tipo de equipamento (1=Satelite, 7=SpyTrack, etc)
  v_manut boolean default false,                   -- vManut (em manutenção)
  raw jsonb,                                       -- payload completo
  updated_at timestamptz not null default now()
);

create index if not exists idx_tc_vehicles_placa on tc_vehicles(placa);

-- Mensagens dos veículos (vem de RequestMensagemCB)
-- Cada mensagem é uma posição/evento; ~30 vehiculos × ~1msg/min quando movendo
create table if not exists tc_messages (
  mld bigint primary key,                          -- ID único da mensagem (cursor)
  vei_id integer not null,
  dt timestamptz not null,                         -- data/hora da mensagem (no veículo)
  dt_inc timestamptz,                              -- data/hora no servidor Trucks Control
  lat numeric(10,6),
  lon numeric(10,6),
  mun text,
  uf text,
  rod text,
  rua text,
  vel smallint,                                    -- velocidade km/h (-1 = não enviou)
  odm integer,                                     -- odômetro km — FONTE DE VERDADE PARA KM RODADO
  rpm smallint,
  lt integer,                                      -- litros no tanque
  evt4 smallint,                                   -- ignição: -1=desconhecido, 0=desligada, 1=ligada
  evt_g smallint,                                  -- evento gerador da mensagem
  ori smallint,                                    -- origem (1=Satelite, 2=GSM Híbrido, ...)
  tp_msg smallint,                                 -- tipo mensagem (1=estado, 2=log posição, 3=macro)
  d_mac text,                                      -- descrição macro
  tfr_id integer,                                  -- código da macro
  mot text,                                        -- nome motorista (eventos digital/senha)
  mot_id integer,
  carreta text,
  st1 integer, st2 integer, st3 integer,           -- sensores temperatura
  umd1 integer, umd2 integer, umd3 integer,        -- sensores umidade
  events jsonb,                                    -- map { "evt5": true, "evt13": true } só dos evts presentes
  raw jsonb,                                       -- payload XML completo (parsed)
  inserted_at timestamptz not null default now()
);

create index if not exists idx_tc_messages_vei_dt on tc_messages(vei_id, dt);
create index if not exists idx_tc_messages_dt on tc_messages(dt);
create index if not exists idx_tc_messages_evt_g on tc_messages(evt_g) where evt_g is not null;
-- Index parcial pra acelerar cálculo de KM
create index if not exists idx_tc_messages_odm on tc_messages(vei_id, dt) where odm is not null and odm > 0;

-- Estado da sincronização (key-value)
create table if not exists tc_sync_state (
  key text primary key,
  value_bigint bigint,
  value_text text,
  value_timestamptz timestamptz,
  updated_at timestamptz not null default now()
);

insert into tc_sync_state (key, value_bigint, value_timestamptz)
values ('last_mld', 1, null)
on conflict (key) do nothing;

insert into tc_sync_state (key, value_text, value_timestamptz)
values ('last_sync_status', 'never', null)
on conflict (key) do nothing;

-- View: KM rodado por veículo por dia
-- Lógica: max(odm) - min(odm) na janela. Diff negativo (reset/overflow) = 0.
-- Timezone fixo em America/Sao_Paulo pra agrupar dia "do brasileiro".
create or replace view tc_km_daily as
select
  m.vei_id,
  v.placa,
  v.ident,
  ((m.dt at time zone 'America/Sao_Paulo')::date) as dia,
  min(m.odm) as odm_min,
  max(m.odm) as odm_max,
  greatest(max(m.odm) - min(m.odm), 0) as km_rodado,
  count(*) as msg_count
from tc_messages m
left join tc_vehicles v on v.vei_id = m.vei_id
where m.odm is not null and m.odm > 0
group by m.vei_id, v.placa, v.ident, ((m.dt at time zone 'America/Sao_Paulo')::date);

-- View: KM rodado por veículo por mês (agregação do daily)
create or replace view tc_km_monthly as
select
  vei_id,
  placa,
  ident,
  date_trunc('month', dia)::date as mes,
  sum(km_rodado) as km_rodado,
  sum(msg_count) as msg_count,
  count(distinct dia) as dias_com_dado
from tc_km_daily
group by vei_id, placa, ident, date_trunc('month', dia);
