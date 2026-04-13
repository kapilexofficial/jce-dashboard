import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JCE Dashboard - Gestao Logistica",
  description: "Dashboard de gestao logistica J.C.E Transportes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="!h-4 mr-2" />
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                J.C.E Transportes
              </span>
            </header>
            <main className="flex-1 p-6 lg:p-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
