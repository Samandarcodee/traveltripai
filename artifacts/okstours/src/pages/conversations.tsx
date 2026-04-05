import React, { useState } from "react";
import { Link } from "wouter";
import { useListConversations } from "@workspace/api-client-react";
import { format } from "date-fns";
import { MessageSquare, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon } from "@/components/channel-icon";

const statusLabels: Record<string, string> = {
  active: "Faol",
  pending: "Kutilmoqda",
  closed: "Yopilgan",
};

const channelLabels: Record<string, string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  web: "Web",
  sms: "SMS",
  email: "Email",
};

export default function Conversations() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = useListConversations({
    status: status !== "all" ? (status as any) : undefined,
  });

  const filtered = (conversations ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.customerName ?? "").toLowerCase().includes(q) ||
      (c.customerPhone ?? "").toLowerCase().includes(q) ||
      c.channel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suhbatlar</h1>
          <p className="text-muted-foreground">AI agent bilan barcha mijoz muloqotlari.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px] h-9">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="active">Faol</SelectItem>
              <SelectItem value="pending">Kutilmoqda</SelectItem>
              <SelectItem value="closed">Yopilgan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-8 flex justify-center text-muted-foreground animate-pulse">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Suhbatlar topilmadi</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {search ? "Qidiruv so'zini o'zgartiring." : "AI Chat orqali yangi suhbat boshlang."}
            </p>
          </div>
        ) : (
          <div className="divide-y overflow-auto">
            {filtered.map((conv) => (
              <Link
                key={conv.id}
                href={`/conversations/${conv.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group block"
              >
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <ChannelIcon channel={conv.channel} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold truncate">
                        {conv.customerName || conv.customerPhone || "Noma'lum mijoz"}
                      </span>
                      <Badge
                        variant={conv.status === "active" ? "default" : conv.status === "pending" ? "secondary" : "outline"}
                        className="text-[10px] h-5 shrink-0"
                      >
                        {statusLabels[conv.status] ?? conv.status}
                      </Badge>
                      {conv.operatorMode && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-700 border-amber-200 shrink-0">
                          Operator
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2 shrink-0">
                      {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), "d MMM, HH:mm") : ""}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage || "Hali xabar yo'q"}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground/60 capitalize">
                      {channelLabels[conv.channel] ?? conv.channel}
                    </span>
                    {conv.leadId && (
                      <>
                        <span className="text-[10px] text-muted-foreground/40">•</span>
                        <span className="text-[10px] text-muted-foreground/60">Lid #{conv.leadId}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {!isLoading && (
        <p className="text-xs text-muted-foreground">
          Jami {conversations?.length ?? 0} suhbat, {filtered.length} ta ko'rsatilmoqda
        </p>
      )}
    </div>
  );
}
