"use client";

import {
  LayoutDashboard,
  FileBarChart,
  MapPin,
  Truck,
  DollarSign,
  AlertTriangle,
  Package,
  BarChart3,
  Users,
  Receipt,
  PieChart,
  Wrench,
  Gauge,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    group: "Visao Geral",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Faturamento", href: "/faturamento", icon: BarChart3 },
    ],
  },
  {
    group: "Operacional",
    items: [
      { title: "Fretes", href: "/fretes", icon: Truck },
      { title: "Tracking", href: "/tracking", icon: MapPin },
      { title: "Ocorrencias", href: "/ocorrencias", icon: AlertTriangle },
      { title: "Coletas", href: "/coletas", icon: Package },
    ],
  },
  {
    group: "Analise",
    items: [
      { title: "Analise Fretes", href: "/analise-fretes", icon: Activity },
      { title: "Analise Clientes", href: "/clientes", icon: PieChart },
      { title: "Performance", href: "/performance", icon: Users },
      { title: "DRE Veiculo", href: "/dre", icon: Receipt },
      { title: "Motorista", href: "/motorista", icon: Truck },
      { title: "Telemetria", href: "/telemetria", icon: Gauge },
    ],
  },
  {
    group: "Manutencao",
    items: [
      { title: "Ordens de Servico", href: "/manutencao", icon: Wrench },
    ],
  },
  {
    group: "Gestao",
    items: [
      { title: "Fechamento Mensal", href: "/fechamento", icon: FileBarChart },
      { title: "Financeiro", href: "/financeiro", icon: DollarSign },
      { title: "Relatorios", href: "/relatorios", icon: FileBarChart },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">JCE Trans</span>
            <p className="text-[10px] text-sidebar-foreground/40 font-medium tracking-wide uppercase mt-0.5">
              Gestao Logistica
            </p>
          </div>
        </div>
      </SidebarHeader>
      <Separator className="!bg-sidebar-border" />
      <SidebarContent className="px-3 pt-3">
        {navItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/30 font-semibold mb-1">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-[13px]">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-5 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
          <span className="text-[11px] text-sidebar-foreground/40">ESL Cloud conectada</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
