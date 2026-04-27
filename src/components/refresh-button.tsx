"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const handleRefresh = () => {
    startTransition(async () => {
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
      router.refresh();
      setLastRefreshed(new Date());
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className="gap-2 h-8"
      title={
        lastRefreshed
          ? `Última atualização: ${lastRefreshed.toLocaleTimeString("pt-BR")}`
          : "Atualizar dados"
      }
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      <span className="text-xs">{isPending ? "Atualizando..." : "Atualizar"}</span>
    </Button>
  );
}
