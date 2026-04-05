import React, { useState } from "react";
import { Link } from "wouter";
import { useListLeads, useCreateLead } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Users, Filter, Plus, Search, Phone, MapPin, X, Save, DollarSign, User } from "lucide-react";
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

export default function Leads() {
  const [segment, setSegment] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col h-full space-y-6">
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
          <Button onClick={() => setCreateOpen(true)} className="gap-2 h-9">
            <Plus className="w-4 h-4" /> Новый лид
          </Button>
        </div>
      </div>

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
            {filtered.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block group">
                <div className="bg-card border hover:border-primary/50 hover:shadow-md transition-all p-5 rounded-xl h-full flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
                      {lead.name || "Неизвестный лид"}
                    </h3>
                    <Badge variant="outline" className={`ml-2 shrink-0 text-xs ${segmentColors[lead.segment] ?? ""}`}>
                      {segmentLabels[lead.segment] ?? lead.segment}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {lead.destination && (
                      <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{lead.destination}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    )}
                    {lead.budget && (
                      <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 shrink-0" />
                        <span>{lead.budget}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <Badge className={`text-[10px] font-medium ${statusColors[lead.status] ?? ""}`} variant="secondary">
                      {statusLabels[lead.status] ?? lead.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(lead.createdAt), "d MMM yyyy")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Всего {leads?.length ?? 0} лидов, показано {filtered.length}
        </p>
      )}

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
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Имя фамилия"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Телефон</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+998901234567"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@gmail.com"
                type="email"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Направление</label>
                <Input
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  placeholder="Дубай, Стамбул..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Бюджет</label>
                <Input
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="$1000"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Интерес</label>
              <Input
                value={form.interest}
                onChange={(e) => setForm({ ...form, interest: e.target.value })}
                placeholder="Авиабилет, тур, отель..."
              />
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
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setCreateOpen(false); resetForm(); }}>
                <X className="w-4 h-4 mr-2" /> Отмена
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleCreate}
                disabled={!form.name.trim() || createMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
