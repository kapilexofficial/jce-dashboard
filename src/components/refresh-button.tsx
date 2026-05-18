"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/refresh", { method: "POST" });
        const data = await res.json().catch(() => null);
        if (data?.sync?.status === "throttled") {
          setStatus("aguarde");
          setTimeout(() => setStatus(null), 3000);
        } else if (data?.sync?.messages_synced > 0) {
          setStatus(`+${data.sync.messages_synced} mensagens`);
          setTimeout(() => setStatus(null), 3000);
        }
      } catch {}
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className="gap-2 h-8"
      title="Forçar sincronização Trucks Control + revalidar caches"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      <span className="text-xs">
        {isPending ? "Sincronizando..." : status ?? "Atualizar"}
      </span>
    </Button>
  );
}
