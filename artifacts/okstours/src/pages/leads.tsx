import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListLeads, useCreateLead } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Users, Filter, Plus, Search, Phone, MapPin, X, Save,
  DollarSign, User, AlertTriangle, Send, CheckSquare, Square,
  Megaphone, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const segmentColors: Record<string, string> = {
  hot: "bg-red-100 text-red-700 border-red-200",
  warm: "bg-amber-100 text-amber-700 border-amber-200",
  cold: "bg-blue-100 text-blue-700 border-blue-200",
};
const segmentLabels: Record<string, string> = { hot: "Горячий", warm: "Тёплый", cold: "Холодный" };
const statusLabels: Record<string, string> = {
  new: "Новый", contacted: "Связались", qualified: "Квалифицирован", booked: "Бронь", lost: "Потерян",
};
const statusColors: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  qualified: "bg-purple-100 text-purple-700",
  booked: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-teal-500",
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

function isRotting(lead: { updatedAt: string; status: string }): boolean {
  return daysSince(lead.updatedAt) > 3 && lead.status !== "booked" && lead.status !== "lost";
}

export default function Leads() {
  const [segment, setSegment] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSegment, setBulkSegment] = useState("all");
  const [bulkSearch, setBulkSearch] = useState("");
  const [sending, setSending] = useState(false);

  const { data: leads, isLoading } = useListLeads({
    segment: segment !== "all" ? (segment as any) : undefined,
  });

  const createMutation = useCreateLead();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", destination: "", budget: "",
    segment: "cold" as "hot" | "warm" | "cold",
    status: "new" as "new" | "contacted" | "qualified" | "booked" | "lost",
    interest: "", notes: "",
  });

  const resetForm = () => setForm({
    name: "", phone: "", email: "", destination: "", budget: "",
    segment: "cold", status: "new", interest: "", notes: "",
  });

  const handleCreate = () => {
    const payload: any = {};
    Object.entries(form).forEach(([k, v]) => { if (v !== "") payload[k] = v; });
    payload.segment = form.segment;
    payload.status = form.status;

    createMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
          setCreateOpen(false);
          resetForm();
          toast({ title: "Создано", description: "Новый лид успешно добавлен." });
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Ошибка при создании лида.", variant: "destructive" });
        },
      }
    );
  };

  const filtered = (leads ?? []).filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.name ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").toLowerCase().includes(q) ||
      (l.destination ?? "").toLowerCase().includes(q)
    );
  });

  const rottingLeads = filtered.filter(isRotting);

  // Bulk messaging — filterable list
  const bulkLeads = useMemo(() => {
    return (leads ?? []).filter((l) => {
      if (bulkSegment !== "all" && l.segment !== bulkSegment) return false;
      if (bulkSearch) {
        const q = bulkSearch.toLowerCase();
        return (
          (l.name ?? "").toLowerCase().includes(q) ||
          (l.destination ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, bulkSegment, bulkSearch]);

  const allBulkSelected = bulkLeads.length > 0 && bulkLeads.every((l) => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    if (allBulkSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bulkLeads.map((l) => l.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkSend = async () => {
    if (selectedIds.size === 0 || !bulkMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/leads/bulk-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), message: bulkMessage }),
      });
      const data = await res.json();
      toast({
        title: "Рассылка завершена",
        description: `Отправлено: ${data.sent}, ошибок: ${data.failed} из ${data.total}`,
      });
      setBulkOpen(false);
      setBulkMessage("");
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    } catch {
      toast({ title: "Ошибка", description: "Ошибка при отправке рассылки.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col h-full space-y-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Лиды (CRM)</h1>
          <p className="text-muted-foreground">Управление потенциальными клиентами и бронированиями.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-52 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." className="pl-9 h-9" />
          </div>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="hot">Горячий</SelectItem>
              <SelectItem value="warm">Тёплый</SelectItem>
              <SelectItem value="cold">Холодный</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setBulkOpen(true); setSelectedIds(new Set()); }} className="gap-2 h-9">
            <Megaphone className="w-4 h-4" /> Рассылка
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 h-9">
            <Plus className="w-4 h-4" /> Новый лид
          </Button>
        </div>
      </div>

      {rottingLeads.length > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
          <div>
            <span className="font-semibold">{rottingLeads.length} лид{rottingLeads.length > 1 ? "ов" : ""} без активности более 3 дней.</span>
            <span className="text-orange-700 text-sm ml-2">Требуется контакт: {rottingLeads.map((l) => l.name || "Неизвестный").join(", ")}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 flex justify-center text-muted-foreground animate-pulse">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 bg-card border rounded-xl flex flex-col items-center justify-center text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Лиды не найдены</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {search ? "Измените поисковый запрос." : "Добавьте нового лида или войдите через AI чат."}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-2" variant="outline">
                <Plus className="w-4 h-4" /> Добавить лид
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((lead) => {
              const rotting = isRotting(lead);
              const daysAgo = Math.floor(daysSince(lead.updatedAt));
              return (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="block group">
                  <div className={`bg-card border hover:shadow-md transition-all p-4 rounded-xl h-full flex flex-col gap-3 ${
                    rotting ? "border-orange-300 hover:border-orange-400" : "hover:border-primary/50"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor(lead.name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {getInitials(lead.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 justify-between">
                          <div className="flex items-center gap-1 min-w-0">
                            {rotting && <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                              {lead.name || "Неизвестный"}
                            </h3>
                          </div>
                          <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ${segmentColors[lead.segment] ?? ""}`}>
                            {segmentLabels[lead.segment] ?? lead.segment}
                          </Badge>
                        </div>
                        {lead.destination && (
                          <div className="flex items-center text-xs text-muted-foreground gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{lead.destination}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 pl-[52px]">
                      {lead.phone && (
                        <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lead.phone}</span>
                        </div>
                      )}
                      {lead.budget && (
                        <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                          <DollarSign className="w-3 h-3 shrink-0" />
                          <span>{lead.budget}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t mt-auto">
                      <Badge className={`text-[10px] font-medium ${statusColors[lead.status] ?? ""}`} variant="secondary">
                        {statusLabels[lead.status] ?? lead.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {rotting
                          ? <span className="text-orange-600 font-medium">{daysAgo} дн. назад</span>
                          : format(new Date(lead.updatedAt), "d MMM yyyy", { locale: ru })
                        }
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Всего {leads?.length ?? 0} лидов, показано {filtered.length}
          {rottingLeads.length > 0 && (
            <span className="ml-2 text-orange-600 font-medium">• {rottingLeads.length} без активности</span>
          )}
        </p>
      )}

      {/* ── CREATE LEAD DIALOG ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Добавить новый лид
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Имя *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Имя фамилия" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Телефон</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998901234567" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@gmail.com" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Направление</label>
                <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Дубай, Стамбул..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Бюджет</label>
                <Input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="$1000" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Интерес</label>
              <Input value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} placeholder="Авиабилет, тур, отель..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Сегмент</label>
                <Select value={form.segment} onValueChange={(v: any) => setForm({ ...form, segment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Горячий</SelectItem>
                    <SelectItem value="warm">Тёплый</SelectItem>
                    <SelectItem value="cold">Холодный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Статус</label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Новый</SelectItem>
                    <SelectItem value="contacted">Связались</SelectItem>
                    <SelectItem value="qualified">Квалифицирован</SelectItem>
                    <SelectItem value="booked">Забронировано</SelectItem>
                    <SelectItem value="lost">Потерян</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Примечание</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Дополнительная информация..." rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setCreateOpen(false); resetForm(); }}>
                <X className="w-4 h-4 mr-2" /> Отмена
              </Button>
              <Button className="flex-1 gap-2" onClick={handleCreate} disabled={!form.name.trim() || createMutation.isPending}>
                <Save className="w-4 h-4" />
                {createMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── BULK MESSAGING DIALOG ─────────────────────────── */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) { setSelectedIds(new Set()); setBulkMessage(""); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Массовая рассылка
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={bulkSearch} onChange={(e) => setBulkSearch(e.target.value)} placeholder="Фильтр по имени или направлению..." className="pl-9 h-9" />
            </div>
            <Select value={bulkSegment} onValueChange={setBulkSegment}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все сегменты</SelectItem>
                <SelectItem value="hot">Горячий</SelectItem>
                <SelectItem value="warm">Тёплый</SelectItem>
                <SelectItem value="cold">Холодный</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
            <div
              className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={toggleSelectAll}
            >
              {allBulkSelected
                ? <CheckSquare className="w-4 h-4 text-primary" />
                : <Square className="w-4 h-4 text-muted-foreground" />
              }
              <span className="text-sm font-medium">Выбрать всех ({bulkLeads.length})</span>
              {selectedIds.size > 0 && (
                <Badge className="ml-auto text-xs">{selectedIds.size} выбрано</Badge>
              )}
            </div>
            <div className="overflow-y-auto flex-1 max-h-64">
              {bulkLeads.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Нет лидов по фильтру</div>
              ) : (
                bulkLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors border-b last:border-b-0 ${selectedIds.has(lead.id) ? "bg-primary/5" : ""}`}
                    onClick={() => toggleSelect(lead.id)}
                  >
                    {selectedIds.has(lead.id)
                      ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      : <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name || "Неизвестный"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.destination ? `${lead.destination} • ` : ""}{segmentLabels[lead.segment]}
                        {!lead.conversationId && <span className="text-orange-500 ml-1">(нет чата)</span>}
                      </p>
                    </div>
                    {isRotting(lead) && <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Текст сообщения</label>
              <Textarea
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder="Привет! У нас горячая акция на туры в Дубай — скидка 15% до конца недели. Успейте забронировать!"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">Сообщение будет отправлено через Telegram выбранным лидам с активным чатом.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setBulkOpen(false)}>
                <X className="w-4 h-4 mr-2" /> Отмена
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleBulkSend}
                disabled={selectedIds.size === 0 || !bulkMessage.trim() || sending}
              >
                <Send className="w-4 h-4" />
                {sending ? "Отправка..." : `Отправить (${selectedIds.size})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
