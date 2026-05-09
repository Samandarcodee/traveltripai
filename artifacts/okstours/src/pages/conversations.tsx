import React, { useState } from "react";
import { Link } from "wouter";
import { useListConversations } from "@workspace/api-client-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import {
  MessageSquare, Search, Bot, Headset, CheckCircle,
  Clock, Flame, Thermometer, Snowflake, Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon } from "@/components/channel-icon";
import { getInitials, getAvatarColor } from "@/lib/avatar";

function formatTime(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Вчера";
  return format(d, "d MMM", { locale: ru });
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  active:  { label: "Активный",  dot: "bg-green-500",  badge: "bg-green-100 text-green-700 border-green-200" },
  pending: { label: "Ожидание",  dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700 border-amber-200" },
  closed:  { label: "Закрыт",    dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

const SEGMENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  hot:  { icon: Flame,       color: "text-red-500",    label: "Горячий"  },
  warm: { icon: Thermometer, color: "text-amber-500",  label: "Тёплый"   },
  cold: { icon: Snowflake,   color: "text-blue-400",   label: "Холодный" },
};

type TabValue = "all" | "active" | "pending" | "closed";

const TABS: { value: TabValue; label: string }[] = [
  { value: "all",     label: "Все"      },
  { value: "active",  label: "Активные" },
  { value: "pending", label: "Ожидание" },
  { value: "closed",  label: "Закрытые" },
];

export default function Conversations() {
  const [tab, setTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = useListConversations(
    { status: tab !== "all" ? (tab as any) : undefined },
    { query: { refetchInterval: 8000 } }
  );

  const conversationsList = Array.isArray(conversations) ? conversations : [];

  const filtered = conversationsList.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.customerName ?? "").toLowerCase().includes(q) ||
      (c.customerPhone ?? "").toLowerCase().includes(q) ||
      c.channel.toLowerCase().includes(q)
    );
  });

  const counts = {
    all:     conversationsList.length,
    active:  conversationsList.filter((c) => c.status === "active").length,
    pending: conversationsList.filter((c) => c.status === "pending").length,
    closed:  conversationsList.filter((c) => c.status === "closed").length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Диалоги</h1>
            <p className="text-sm text-muted-foreground">
              Все переписки клиентов с AI агентом Aziz
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span>AI режим активен</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону или каналу..."
            className="pl-9 h-9 bg-muted/40 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 -mb-px ${
                tab === t.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {counts[t.value] > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  tab === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {counts[t.value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground opacity-40" />
            </div>
            <h3 className="text-base font-semibold">Диалоги не найдены</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {search ? "Попробуйте другой запрос" : "Начните новый чат через AI Чат"}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((conv, idx) => {
              const name = conv.customerName || conv.customerPhone || "Неизвестный";
              const cfg = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.closed!;
              const lead = (conv as any).lead;
              const segment = lead?.segment as string | undefined;
              const segCfg = segment ? SEGMENT_CONFIG[segment] : undefined;
              const SegIcon = segCfg?.icon;

              return (
                <Link
                  key={conv.id}
                  href={`/conversations/${conv.id}`}
                  className="block"
                >
                  <div className={`flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/50 ${
                    idx === 0 ? "border-t border-border/50" : ""
                  }`}>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full ${getAvatarColor(name)} flex items-center justify-center text-white font-bold text-sm`}>
                        {getInitials(name)}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${cfg.dot}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: name + badges + time */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-sm truncate">{name}</span>
                          {conv.operatorMode && (
                            <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                              <Headset className="w-2.5 h-2.5" /> Оператор
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      {/* Row 2: last message */}
                      <p className="text-[12px] text-muted-foreground truncate leading-snug mb-1">
                        {conv.lastMessage || "Сообщений пока нет"}
                      </p>

                      {/* Row 3: channel + segment + status */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <ChannelIcon channel={conv.channel} className="w-3 h-3" />
                          <span>{conv.channel === "telegram" ? "Telegram" : conv.channel === "web" ? "Web" : conv.channel}</span>
                        </div>
                        {conv.leadId && (
                          <span className="text-[10px] text-muted-foreground/50">· Лид #{conv.leadId}</span>
                        )}
                        {SegIcon && segCfg && (
                          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${segCfg.color}`}>
                            <SegIcon className="w-2.5 h-2.5" />
                            <span>{segCfg.label}</span>
                          </div>
                        )}
                        <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="px-5 py-2.5 border-t bg-muted/20 shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Показано <span className="font-medium text-foreground">{filtered.length}</span> из {conversations?.length ?? 0} диалогов
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {counts.active} активных
          </span>
        </div>
      )}
    </div>
  );
}
