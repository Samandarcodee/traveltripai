import React, { useState } from "react";
import { useListTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "@workspace/api-client-react";
import { FileText, Plus, Edit2, Trash2, Save, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "general", label: "Umumiy" },
  { value: "greeting", label: "Salomlashish" },
  { value: "ticket", label: "Aviabilet" },
  { value: "hotel", label: "Mehmonxona" },
  { value: "tour", label: "Tur" },
  { value: "visa", label: "Viza" },
  { value: "payment", label: "To'lov" },
];

const categoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

const categoryColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-700 border-gray-200",
  greeting: "bg-blue-100 text-blue-700 border-blue-200",
  ticket: "bg-sky-100 text-sky-700 border-sky-200",
  hotel: "bg-purple-100 text-purple-700 border-purple-200",
  tour: "bg-green-100 text-green-700 border-green-200",
  visa: "bg-yellow-100 text-yellow-700 border-yellow-200",
  payment: "bg-red-100 text-red-700 border-red-200",
};

type TemplateForm = {
  category: string;
  title: string;
  content: string;
  sortOrder: number;
};

const emptyForm = (): TemplateForm => ({
  category: "general",
  title: "",
  content: "",
  sortOrder: 0,
});

export default function Templates() {
  const { data: templates, isLoading } = useListTemplates();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState("all");

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({ category: t.category, title: t.title, content: t.content, sortOrder: t.sortOrder });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "To'ldiring", description: "Sarlavha va kontent majburiy.", variant: "destructive" });
      return;
    }

    if (editId !== null) {
      updateMutation.mutate(
        { id: editId, data: form },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
            setDialogOpen(false);
            toast({ title: "Yangilandi", description: "Shablon muvaffaqiyatli yangilandi." });
          },
          onError: () => toast({ title: "Xatolik", variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { data: form },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
            setDialogOpen(false);
            toast({ title: "Yaratildi", description: "Shablon qo'shildi." });
          },
          onError: () => toast({ title: "Xatolik", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
          setDeleteId(null);
          toast({ title: "O'chirildi" });
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  const filtered = (templates ?? []).filter((t) => filterCat === "all" || t.category === filterCat);
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach((t) => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Xabar Shablonlari
          </h1>
          <p className="text-muted-foreground">Operator rejimida tezkor foydalanish uchun shablonlar</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Kategoriya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Yangi Shablon
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Hali shablonlar yo'q. Yangi shablon qo'shing.</p>
          <Button onClick={openCreate} className="mt-4 gap-2" variant="outline">
            <Plus className="w-4 h-4" /> Shablon qo'shish
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Badge className={`${categoryColors[cat] ?? ""} border text-xs`}>{categoryLabel(cat)}</Badge>
                <span className="text-muted-foreground/50">{items.length} ta shablon</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((t) => (
                  <Card key={t.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold">{t.title}</CardTitle>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(t)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {t.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId !== null ? "Shablonni Tahrirlash" : "Yangi Shablon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Kategoriya</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Sarlavha</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Masalan: Salomlashish xabari"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kontent</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Shablon matni..."
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.content.length} belgi
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tartib raqami</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-24"
                min={0}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {createMutation.isPending || updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O'chirishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription>
              Bu shablonni o'chirib bo'lmaydi. Davom etasizmi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteId !== null && handleDelete(deleteId)}
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
