"use client";

import {
  LayoutDashboard,
  FileBarChart,
  MapPin,
  Truck,
  BarChart3,
  Users,
  Receipt,
  PieChart,
  Wrench,
  Gauge,
  Activity,
} from "lucide-react";
import Image from "next/image";
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
      { title: "Relatorios", href: "/relatorios", icon: FileBarChart },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-5">
        <Link href="/" className="flex flex-col items-center gap-2 transition hover:opacity-90">
          <div className="rounded-lg bg-white/95 px-3 py-2 ring-1 ring-white/10">
            <Image
              src="/logo-jce.png"
              alt="JCE Transportes"
              width={180}
              height={72}
              priority
              className="h-auto w-[160px] object-contain"
            />
          </div>
          <span className="text-[10px] text-sidebar-foreground/40 font-medium tracking-[0.18em] uppercase">
            Gestão Logística
          </span>
        </Link>
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
