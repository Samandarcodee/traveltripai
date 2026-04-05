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
  Send,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const NAV_ITEMS = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/chat", label: "AI Чат Демо", icon: MessageSquare },
  { href: "/conversations", label: "Диалоги", icon: Users },
  { href: "/pipeline", label: "Воронка (Pipeline)", icon: Kanban },
  { href: "/leads", label: "Лиды (CRM)", icon: Briefcase },
  { href: "/promotions", label: "Промо / Акции", icon: Tag },
  { href: "/templates", label: "Шаблоны", icon: FileText },
  { href: "/stats", label: "Статистика", icon: BarChart3 },
  { href: "/call-analysis", label: "Анализ звонков", icon: PhoneCall },
  { href: "/settings", label: "Настройки", icon: Settings2 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const NavLinks = () => (
    <>
      <div className="px-4 py-6">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <span className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">O</span>
          OKSTours
        </h2>
        <p className="text-xs text-sidebar-foreground/60 mt-1 uppercase tracking-wider font-semibold">AI Agent Panel</p>
      </div>
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="block">
              <span
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-sm ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40">OKSTours AI v1.0</p>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] flex w-full bg-background">
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
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
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-0">
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
