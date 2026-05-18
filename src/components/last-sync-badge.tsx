import { getLastSyncInfo } from "@/lib/trucks-control-sync";

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function LastSyncBadge() {
  const info = await getLastSyncInfo();

  if (!info.last_mld_at) {
    return (
      <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
        rastreador: aguardando primeira sincronização
      </span>
    );
  }

  const stale = Date.now() - new Date(info.last_mld_at).getTime() > 60 * 60 * 1000; // 1h
  const error = info.status?.startsWith("error");

  return (
    <span
      className={`text-[11px] hidden sm:inline ${
        error ? "text-red-400" : stale ? "text-amber-400" : "text-muted-foreground/70"
      }`}
      title={`Última sincronização Trucks Control: ${formatTime(info.last_mld_at)} (${info.status})`}
    >
      rastreador: {formatRelative(info.last_mld_at)}
    </span>
  );
}
