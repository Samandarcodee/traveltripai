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
const segmentLabels: Record<string, string> = { hot: "Issiq", warm: "Iliq", cold: "Sovuq" };
const statusLabels: Record<string, string> = {
  new: "Yangi", contacted: "Bog'lanildi", qualified: "Malakali", booked: "Bron", lost: "Yo'qoldi",
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
          toast({ title: "Yaratildi", description: "Yangi lid muvaffaqiyatli qo'shildi." });
        },
        onError: () => {
          toast({ title: "Xatolik", description: "Lid yaratishda xatolik yuz berdi.", variant: "destructive" });
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
          <h1 className="text-3xl font-bold tracking-tight">Lidlar (CRM)</h1>
          <p className="text-muted-foreground">Potentsial mijozlar va bronlarni boshqarish.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-52 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9 h-9" />
          </div>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="hot">Issiq</SelectItem>
              <SelectItem value="warm">Iliq</SelectItem>
              <SelectItem value="cold">Sovuq</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 h-9">
            <Plus className="w-4 h-4" /> Yangi Lid
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 flex justify-center text-muted-foreground animate-pulse">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 bg-card border rounded-xl flex flex-col items-center justify-center text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Lidlar topilmadi</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {search ? "Qidiruv so'zini o'zgartiring." : "Yangi lid qo'shing yoki AI chat orqali kiring."}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)} className="mt-4 gap-2" variant="outline">
                <Plus className="w-4 h-4" /> Yangi Lid Qo'shish
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
                      {lead.name || "Noma'lum Lid"}
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
          Jami {leads?.length ?? 0} lid, {filtered.length} ta ko'rsatilmoqda
        </p>
      )}

      {/* Create Lead Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Yangi Lid Qo'shish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Ism *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ism familiya"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Telefon</label>
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
                <label className="text-sm font-medium mb-1 block">Yo'nalish</label>
                <Input
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  placeholder="Dubai, Istanbul..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Budjet</label>
                <Input
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="$1000"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Qiziqish</label>
              <Input
                value={form.interest}
                onChange={(e) => setForm({ ...form, interest: e.target.value })}
                placeholder="Aviabilet, tur, mehmonxona..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Segment</label>
                <Select value={form.segment} onValueChange={(v: any) => setForm({ ...form, segment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Issiq</SelectItem>
                    <SelectItem value="warm">Iliq</SelectItem>
                    <SelectItem value="cold">Sovuq</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Yangi</SelectItem>
                    <SelectItem value="contacted">Bog'lanildi</SelectItem>
                    <SelectItem value="qualified">Malakali</SelectItem>
                    <SelectItem value="booked">Bron qilindi</SelectItem>
                    <SelectItem value="lost">Yo'qoldi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Izoh</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Qo'shimcha ma'lumotlar..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setCreateOpen(false); resetForm(); }}>
                <X className="w-4 h-4 mr-2" /> Bekor
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleCreate}
                disabled={!form.name.trim() || createMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
