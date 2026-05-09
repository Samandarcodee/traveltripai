import React, { useRef, useEffect } from "react";
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
import { useListConversations } from "@workspace/api-client-react";

function playNotificationBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const { data: activeConvs } = useListConversations(
    { status: "active" },
    { query: { refetchInterval: 8000 } }
  );

  const prevCountRef = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const count = activeConvs?.length ?? 0;
    if (isFirstLoad.current) {
      prevCountRef.current = count;
      isFirstLoad.current = false;
      return;
    }
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      playNotificationBeep();
    }
    prevCountRef.current = count;
  }, [activeConvs?.length]);

  const activeCount = activeConvs?.length ?? 0;

  const NAV_SECTIONS = [
    {
      label: "Главное",
      items: [
        { href: "/", label: "Дашборд", icon: LayoutDashboard, badge: null },
      ],
    },
    {
      label: "Продажи",
      items: [
        { href: "/conversations", label: "Диалоги", icon: MessageSquare, badge: activeCount > 0 ? activeCount : null },
        { href: "/pipeline", label: "Воронка", icon: Kanban, badge: null },
        { href: "/leads", label: "Лиды (CRM)", icon: Briefcase, badge: null },
        { href: "/promotions", label: "Промо / Акции", icon: Tag, badge: null },
        { href: "/templates", label: "Шаблоны", icon: FileText, badge: null },
      ],
    },
    {
      label: "Аналитика",
      items: [
        { href: "/stats", label: "Статистика", icon: BarChart3, badge: null },
        { href: "/call-analysis", label: "Анализ звонков", icon: PhoneCall, badge: null },
      ],
    },
    {
      label: "Система",
      items: [
        { href: "/chat", label: "AI Чат", icon: Bot, badge: null },
        { href: "/settings", label: "Настройки", icon: Settings2, badge: null },
      ],
    },
  ];

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
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                      }`}
                      style={{ transition: "background-color 150ms ease, color 150ms ease" }}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r"
                          aria-hidden="true"
                        />
                      )}
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== null && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none animate-pulse">
                          {item.badge}
                        </span>
                      )}
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
    <div className="h-[100dvh] flex w-full bg-background overflow-hidden">
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border shrink-0">
        <NavLinks />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
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

        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
