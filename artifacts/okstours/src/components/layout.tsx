import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Menu,
  Briefcase,
  Tag,
  BarChart3,
  PhoneCall,
  Kanban,
  FileText,
  Settings2,
  Bot,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const NAV_SECTIONS = [
  {
    label: "Главное",
    items: [
      { href: "/", label: "Дашборд", icon: LayoutDashboard },
    ],
  },
  {
    label: "Продажи",
    items: [
      { href: "/conversations", label: "Диалоги", icon: MessageSquare },
      { href: "/pipeline", label: "Воронка", icon: Kanban },
      { href: "/leads", label: "Лиды (CRM)", icon: Briefcase },
      { href: "/promotions", label: "Промо / Акции", icon: Tag },
      { href: "/templates", label: "Шаблоны", icon: FileText },
    ],
  },
  {
    label: "Аналитика",
    items: [
      { href: "/stats", label: "Статистика", icon: BarChart3 },
      { href: "/call-analysis", label: "Анализ звонков", icon: PhoneCall },
    ],
  },
  {
    label: "Система",
    items: [
      { href: "/chat", label: "AI Чат", icon: Bot },
      { href: "/settings", label: "Настройки", icon: Settings2 },
    ],
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const NavLinks = () => (
    <>
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-base shrink-0">
            O
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-foreground leading-tight">OKSTours</h2>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider font-medium">CRM Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 mb-1">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location === item.href ||
                  (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <span
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 text-sm ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground/30">OKSTours AI v1.0</p>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] flex w-full bg-background">
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border shrink-0">
        <NavLinks />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
          <h1 className="text-lg font-bold text-primary">OKSTours</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Меню</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0 bg-sidebar border-r-0">
              <NavLinks />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
