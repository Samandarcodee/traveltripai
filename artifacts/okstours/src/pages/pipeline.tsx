import React, { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useListLeads, useUpdateLead } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  DollarSign,
  Phone,
  MessageSquare,
  Search,
  Plus,
  Flame,
  Thermometer,
  Snowflake,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { uz } from "date-fns/locale";

type Lead = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  segment: "hot" | "warm" | "cold";
  interest: string | null;
  destination: string | null;
  budget: string | null;
  status: "new" | "contacted" | "qualified" | "booked" | "lost";
  notes: string | null;
  conversationId: number | null;
  createdAt: string;
  updatedAt: string;
};

type Column = {
  id: Lead["status"];
  label: string;
  sublabel: string;
  color: string;
  headerBg: string;
  dotColor: string;
};

const COLUMNS: Column[] = [
  {
    id: "new",
    label: "YANGI LIDLAR",
    sublabel: "Ishga tushirildi",
    color: "border-blue-400",
    headerBg: "bg-blue-500",
    dotColor: "bg-blue-400",
  },
  {
    id: "contacted",
    label: "BOG'LANILDI",
    sublabel: "Aloqa o'rnatildi",
    color: "border-amber-400",
    headerBg: "bg-amber-500",
    dotColor: "bg-amber-400",
  },
  {
    id: "qualified",
    label: "JAVOB KUTILMOQDA",
    sublabel: "Ikkinchi kasatma",
    color: "border-purple-400",
    headerBg: "bg-purple-500",
    dotColor: "bg-purple-400",
  },
  {
    id: "booked",
    label: "BRON QILINDI",
    sublabel: "Tasdiqlangan",
    color: "border-green-400",
    headerBg: "bg-green-500",
    dotColor: "bg-green-400",
  },
  {
    id: "lost",
    label: "YO'QOTILDI",
    sublabel: "Qaytarish kerak",
    color: "border-red-400",
    headerBg: "bg-red-500",
    dotColor: "bg-red-400",
  },
];

const SEGMENT_CONFIG = {
  hot: { icon: Flame, label: "Issiq", class: "text-red-500", badgeClass: "bg-red-50 text-red-600 border-red-200" },
  warm: { icon: Thermometer, label: "Iliq", class: "text-amber-500", badgeClass: "bg-amber-50 text-amber-600 border-amber-200" },
  cold: { icon: Snowflake, label: "Sovuq", class: "text-blue-400", badgeClass: "bg-blue-50 text-blue-600 border-blue-200" },
};

function LeadCard({
  lead,
  onDragStart,
  isDragging,
}: {
  lead: Lead;
  onDragStart: (e: React.DragEvent, leadId: number) => void;
  isDragging: boolean;
}) {
  const seg = SEGMENT_CONFIG[lead.segment];
  const SegIcon = seg.icon;
  const [, navigate] = useLocation();

  const handleCardClick = () => {
    navigate(`/leads/${lead.id}`);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={handleCardClick}
      className={`group bg-card border border-border rounded-xl p-4 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 ${
        isDragging ? "opacity-40 scale-95 rotate-1 cursor-grabbing" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground truncate">
            {lead.name || "Noma'lum"}
          </p>
          {lead.phone && (
            <div className="flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{lead.phone}</p>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium shrink-0 ${seg.badgeClass}`}>
          <SegIcon className={`h-2.5 w-2.5 ${seg.class}`} />
          {seg.label}
        </div>
      </div>

      {(lead.destination || lead.interest) && (
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <p className="text-xs text-foreground/80 truncate">
            {lead.destination || lead.interest}
          </p>
        </div>
      )}

      {lead.budget && (
        <div className="flex items-center gap-1.5 mb-2">
          <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
          <p className="text-xs text-foreground/80">{lead.budget}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/60">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(new Date(lead.createdAt), "d MMM", { locale: uz })}
        </div>
        <div className="flex items-center gap-1.5">
          {lead.conversationId && (
            <Link href={`/conversations/${lead.conversationId}`}>
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-[10px] font-medium"
                title="Suhbatni ochish"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageSquare className="h-3 w-3" />
                Chat
              </button>
            </Link>
          )}
          <Link href={`/leads/${lead.id}`}>
            <button
              className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { data: leads, isLoading } = useListLeads({});
  const updateMutation = useUpdateLead();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const dragLeadRef = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    dragLeadRef.current = leadId;
    setDraggingId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(leadId));
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
    dragLeadRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, colId: Lead["status"]) => {
    e.preventDefault();
    const leadId = dragLeadRef.current;
    if (!leadId) return;

    const lead = leads?.find((l) => l.id === leadId);
    if (!lead || lead.status === colId) {
      setDraggingId(null);
      setDragOverCol(null);
      return;
    }

    updateMutation.mutate(
      { id: leadId, data: { status: colId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
        },
      }
    );

    setDraggingId(null);
    setDragOverCol(null);
  };

  const filtered = (leads ?? []).filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(q) ||
      lead.phone?.toLowerCase().includes(q) ||
      lead.destination?.toLowerCase().includes(q) ||
      lead.interest?.toLowerCase().includes(q)
    );
  });

  const grouped = COLUMNS.reduce<Record<string, Lead[]>>((acc, col) => {
    acc[col.id] = filtered.filter((l) => l.status === col.id);
    return acc;
  }, {});

  const totalLeads = leads?.length ?? 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar */}
      <div className="shrink-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">VORONKA — Sohalar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Jami {totalLeads} lid • Sudrab-tashla orqali statusni o'zgartiring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="pl-9 w-64 h-9 bg-muted/50 border-border text-sm"
            />
          </div>
          <Link href="/leads">
            <Button size="sm" className="gap-2 h-9">
              <Plus className="h-4 w-4" />
              Yangi Lid
            </Button>
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="h-full flex gap-0 min-w-max">
            {COLUMNS.map((col) => {
              const colLeads = grouped[col.id] ?? [];
              const isOver = dragOverCol === col.id;

              return (
                <div
                  key={col.id}
                  className="flex flex-col w-72 shrink-0 border-r border-border last:border-r-0"
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column Header */}
                  <div className={`shrink-0 px-4 py-3.5 border-b-2 ${col.color} bg-card`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                        <span className="text-xs font-bold tracking-wider text-foreground">
                          {col.label}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${col.headerBg}`}>
                        {colLeads.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 ml-4">{col.sublabel}</p>
                  </div>

                  {/* Drop Zone */}
                  <div
                    className={`flex-1 overflow-y-auto p-3 space-y-2.5 transition-colors duration-150 ${
                      isOver
                        ? "bg-primary/5 ring-2 ring-inset ring-primary/30"
                        : "bg-muted/10"
                    }`}
                  >
                    {colLeads.length === 0 && (
                      <div
                        className={`h-24 flex items-center justify-center border-2 border-dashed rounded-xl transition-colors ${
                          isOver ? "border-primary/50 bg-primary/5" : "border-border/50"
                        }`}
                      >
                        <p className="text-xs text-muted-foreground/60">
                          {isOver ? "Shu yerga tashlang" : "Bo'sh"}
                        </p>
                      </div>
                    )}

                    {colLeads.map((lead) => (
                      <div key={lead.id} onDragEnd={handleDragEnd}>
                        <LeadCard
                          lead={lead as Lead}
                          onDragStart={handleDragStart}
                          isDragging={draggingId === lead.id}
                        />
                      </div>
                    ))}

                    {colLeads.length > 0 && isOver && (
                      <div className="h-16 flex items-center justify-center border-2 border-dashed border-primary/50 rounded-xl bg-primary/5">
                        <p className="text-xs text-primary/70">Shu yerga tashlang</p>
                      </div>
                    )}
                  </div>

                  {/* Column Footer */}
                  <div className="shrink-0 px-4 py-2 border-t border-border bg-card/50">
                    <p className="text-[10px] text-muted-foreground text-center">
                      {colLeads.reduce((sum, l) => {
                        const b = l.budget?.replace(/[^0-9]/g, "");
                        return sum + (b ? parseInt(b) : 0);
                      }, 0) > 0
                        ? `Jami: $${colLeads.reduce((sum, l) => {
                            const b = l.budget?.replace(/[^0-9]/g, "");
                            return sum + (b ? parseInt(b) : 0);
                          }, 0).toLocaleString()}`
                        : `${colLeads.length} ta lid`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
