import React, { useState } from "react";
import { useListPromotions, useCreatePromotion, useDeletePromotion } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Tag, MapPin, Percent, CalendarDays } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Promotions() {
  const { data: promotions, isLoading } = useListPromotions();
  const createMutation = useCreatePromotion();
  const deleteMutation = useDeletePromotion();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount: "",
    destination: "",
    validUntil: "",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) return;

    createMutation.mutate(
      {
        data: {
          title: form.title,
          description: form.description,
          discount: form.discount || null,
          destination: form.destination || null,
          validUntil: form.validUntil || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
          setOpen(false);
          setForm({ title: "", description: "", discount: "", destination: "", validUntil: "" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
        },
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Promo / Aksiyalar</h1>
          <p className="text-muted-foreground mt-1">AI agent faol aksiyalarni mijozlarga avtomatik aytib beradi.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Yangi Aksiya
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yangi Aksiya Qo'shish</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Aksiya nomi *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Masalan: Toshkent-Dubai Early Bird"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tavsif *</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Aksiya shartlari va tafsilotlari"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Chegirma</label>
                  <Input
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                    placeholder="Masalan: 20%"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Yo'nalish</label>
                  <Input
                    value={form.destination}
                    onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                    placeholder="Masalan: Dubai"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amal qilish muddati</label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="animate-pulse text-center py-12 text-muted-foreground">Yuklanmoqda...</div>
      ) : !promotions || promotions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Hali aksiyalar yo'q</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Aksiya qo'shing — AI agent uni mijozlarga avtomatik tushuntiradi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((promo) => (
            <Card key={promo.id} className="shadow-sm relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{promo.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {promo.discount && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Percent className="h-3 w-3" />
                          {promo.discount}
                        </Badge>
                      )}
                      {promo.destination && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <MapPin className="h-3 w-3" />
                          {promo.destination}
                        </Badge>
                      )}
                      {promo.validUntil && (
                        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(promo.validUntil).toLocaleDateString("uz-UZ")} gacha
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDelete(promo.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{promo.description}</p>
                <p className="text-xs text-muted-foreground/50 mt-3">
                  {new Date(promo.createdAt).toLocaleDateString("uz-UZ")} da qo'shildi
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4 px-5">
          <p className="text-sm font-medium text-primary mb-1">AI Agent qanday ishlaydi?</p>
          <p className="text-sm text-muted-foreground">
            Faol aksiyalar AI agentning tizim promptiga avtomatik qo'shiladi. Mijoz narx yoki tur so'raganda, AI tegishli aksiyani o'zi tanishtiradi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
