import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetLead, useUpdateLead, useBookLead } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, Save, MapPin, DollarSign, MessageSquare, User, Phone, Mail, CheckCircle2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const segmentColors: Record<string, string> = {
  hot: "bg-red-100 text-red-700 border-red-200",
  warm: "bg-amber-100 text-amber-700 border-amber-200",
  cold: "bg-blue-100 text-blue-700 border-blue-200",
};

const statusLabels: Record<string, string> = {
  new: "Yangi",
  contacted: "Bog'lanildi",
  qualified: "Malakali",
  booked: "Bron qilindi",
  lost: "Yo'qoldi",
};

export default function LeadDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useGetLead(id, { query: { enabled: !!id } });
  const updateMutation = useUpdateLead();
  const bookMutation = useBookLead();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [travelDate, setTravelDate] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  React.useEffect(() => {
    if (lead && !formData) {
      setFormData({
        status: lead.status,
        segment: lead.segment,
        notes: lead.notes || "",
      });
    }
  }, [lead]);

  const handleSave = () => {
    updateMutation.mutate(
      { id, data: formData },
      {
        onSuccess: (data) => {
          queryClient.setQueryData([`/api/leads/${id}`], data);
          setIsEditing(false);
          toast({ title: "Saqlandi", description: "Lid muvaffaqiyatli yangilandi." });
        },
        onError: () => {
          toast({ title: "Xatolik", description: "Saqlashda xatolik yuz berdi.", variant: "destructive" });
        },
      }
    );
  };

  const handleBook = () => {
    bookMutation.mutate(
      { id, data: { travelDate: travelDate || null, notes: bookNotes || null } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData([`/api/leads/${id}`], data);
          setBookOpen(false);
          toast({
            title: "Bron tasdiqlandi! ✈️",
            description: `${lead?.name ?? "Mijoz"} broni muvaffaqiyatli tasdiqlandi. Tasdiqlash xabari yuborildi.`,
          });
        },
        onError: () => {
          toast({ title: "Xatolik", description: "Bron tasdiqlashda xatolik.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Yuklanmoqda...</div>;
  if (!lead) return <div className="p-8 text-center">Lid topilmadi</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/leads">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Lidlarga qaytish
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {lead.status !== "booked" && lead.status !== "lost" && (
            <Dialog open={bookOpen} onOpenChange={setBookOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                  <Plane className="w-4 h-4" />
                  Bron Tasdiqlash
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Bronni Tasdiqlash</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>{lead.name ?? "Mijoz"}</strong> bronini tasdiqlaganingizda, AI agent avtomatik ravishda tasdiqlash xabarini yuboradi.
                  </p>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Sayohat sanasi (ixtiyoriy)</label>
                    <Input
                      type="date"
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Izoh (ixtiyoriy)</label>
                    <Textarea
                      value={bookNotes}
                      onChange={(e) => setBookNotes(e.target.value)}
                      placeholder="Reys raqami, mehmonxona..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setBookOpen(false)}>
                      Bekor qilish
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      onClick={handleBook}
                      disabled={bookMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {bookMutation.isPending ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Bekor qilish</Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" /> Saqlash
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Tahrirlash
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{lead.name || "Noma'lum Lid"}</h1>
          <div className="flex flex-wrap gap-2 items-center">
            {isEditing ? (
              <Select value={formData?.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Yangi</SelectItem>
                  <SelectItem value="contacted">Bog'lanildi</SelectItem>
                  <SelectItem value="qualified">Malakali</SelectItem>
                  <SelectItem value="booked">Bron qilindi</SelectItem>
                  <SelectItem value="lost">Yo'qoldi</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={lead.status === "booked" ? "bg-green-100 text-green-700 border-green-200 capitalize" : "capitalize"}>
                {statusLabels[lead.status] ?? lead.status}
              </Badge>
            )}

            {isEditing ? (
              <Select value={formData?.segment} onValueChange={(v) => setFormData({ ...formData, segment: v })}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Issiq</SelectItem>
                  <SelectItem value="warm">Iliq</SelectItem>
                  <SelectItem value="cold">Sovuq</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className={`capitalize ${segmentColors[lead.segment] ?? ""}`}>
                {lead.segment === "hot" ? "Issiq" : lead.segment === "warm" ? "Iliq" : "Sovuq"}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(lead.createdAt), "PPP")} da qo'shilgan
            </span>
          </div>
        </div>

        {lead.conversationId && (
          <Link href={`/conversations/${lead.conversationId}`}>
            <Button variant="secondary" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" /> Suhbatni ko'rish
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sayohat Ma'lumotlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Yo'nalish
                </span>
                <p className="font-medium">{lead.destination || "Ko'rsatilmagan"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Budjet
                </span>
                <p className="font-medium">{lead.budget || "Ko'rsatilmagan"}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Qiziqish</span>
                <p className="font-medium">{lead.interest || "Ko'rsatilmagan"}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2 mt-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Ichki Izohlar</span>
              {isEditing ? (
                <Textarea
                  value={formData?.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-[120px]"
                  placeholder="Lid haqida izoh qo'shing..."
                />
              ) : (
                <div className="bg-muted/50 p-4 rounded-md text-sm whitespace-pre-wrap min-h-[100px]">
                  {lead.notes || "Hali izoh yo'q."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Aloqa Ma'lumotlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="break-all">
                <span className="text-xs text-muted-foreground block">Ism</span>
                <span className="font-medium">{lead.name || "N/A"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="break-all">
                <span className="text-xs text-muted-foreground block">Telefon</span>
                <span className="font-medium">{lead.phone || "N/A"}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="break-all">
                <span className="text-xs text-muted-foreground block">Email</span>
                <span className="font-medium">{lead.email || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
