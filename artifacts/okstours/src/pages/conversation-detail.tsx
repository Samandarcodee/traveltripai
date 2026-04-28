import React, { useRef, useEffect, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
  useGetConversation,
  useGetConversationMessages,
  useUpdateConversation,
  useOperatorReply,
  useSendFollowUp,
  useListTemplates,
  useGetLead,
  useUpdateLead,
} from "@workspace/api-client-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowLeft, User, Bot, CheckCircle, Headset, Send, Zap, Shield,
  ChevronDown, FileText, MessageSquare, Phone, MapPin, DollarSign,
  Calendar, ExternalLink, RefreshCw, Tag, StickyNote, Flame, Thermometer,
  Snowflake, Clock, Check, X, Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChannelIcon } from "@/components/channel-icon";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  active: "Активный",
  pending: "Ожидание",
  closed: "Закрыт",
};

const leadStatusLabels: Record<string, string> = {
  new: "Новый",
  contacted: "Связались",
  qualified: "Квалифицирован",
  booked: "Забронировано",
  lost: "Потерян",
};

const leadStatusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-amber-100 text-amber-700 border-amber-200",
  qualified: "bg-purple-100 text-purple-700 border-purple-200",
  booked: "bg-green-100 text-green-700 border-green-200",
  lost: "bg-red-100 text-red-700 border-red-200",
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

export default function ConversationDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversation, isLoading: convLoading } = useGetConversation(id, {
    query: { enabled: !!id },
  });
  const { data: messages, isLoading: msgsLoading } = useGetConversationMessages(id, {
    query: { enabled: !!id && !!conversation },
  });
  const { data: templates } = useListTemplates();
  const { data: lead } = useGetLead(conversation?.leadId ?? 0, {
    query: { enabled: !!conversation?.leadId },
  });

  const updateMutation = useUpdateConversation();
  const operatorReplyMutation = useOperatorReply();
  const followUpMutation = useSendFollowUp();
  const updateLeadMutation = useUpdateLead();

  const [operatorInput, setOperatorInput] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (lead?.notes !== undefined) setNotesValue(lead.notes ?? "");
  }, [lead?.notes]);

  const refreshMessages = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: [`/api/conversations/${id}/messages`] });
    await queryClient.invalidateQueries({ queryKey: [`/api/conversations/${id}`] });
    setTimeout(() => setIsRefreshing(false), 600);
  }, [id, queryClient]);

  useEffect(() => {
    const interval = setInterval(refreshMessages, 6000);
    return () => clearInterval(interval);
  }, [refreshMessages]);

  const handleClose = () => {
    updateMutation.mutate(
      { id, data: { status: "closed" } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData([`/api/conversations/${id}`], (old: any) =>
            old ? { ...old, status: data.status } : old
          );
        },
      }
    );
  };

  const toggleOperatorMode = () => {
    const newMode = !conversation?.operatorMode;
    updateMutation.mutate(
      { id, data: { operatorMode: newMode } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData([`/api/conversations/${id}`], (old: any) =>
            old ? { ...old, operatorMode: data.operatorMode } : old
          );
          toast({
            title: newMode ? "Режим оператора включён" : "AI агент включён",
            description: newMode
              ? "Теперь вы отвечаете клиенту вручную."
              : "AI агент снова отвечает автоматически.",
          });
        },
      }
    );
  };

  const handleOperatorSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorInput.trim() || operatorReplyMutation.isPending) return;
    const content = operatorInput;
    setOperatorInput("");
    operatorReplyMutation.mutate(
      { id, data: { content } },
      {
        onSuccess: (newMsg) => {
          queryClient.setQueryData(
            [`/api/conversations/${id}/messages`],
            (old: any[]) => old ? [...old, newMsg] : [newMsg]
          );
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${id}`] });
          if (conversation?.leadId) {
            queryClient.invalidateQueries({ queryKey: [`/api/leads/${conversation.leadId}`] });
          }
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Ошибка при отправке сообщения.", variant: "destructive" });
        },
      }
    );
  };

  const handleFollowUp = () => {
    followUpMutation.mutate(
      { id },
      {
        onSuccess: (newMsg) => {
          queryClient.setQueryData(
            [`/api/conversations/${id}/messages`],
            (old: any[]) => old ? [...old, newMsg] : [newMsg]
          );
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${id}`] });
          toast({ title: "Follow-up отправлен" });
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Ошибка при отправке follow-up.", variant: "destructive" });
        },
      }
    );
  };

  const handleLeadStatusChange = (newStatus: string) => {
    if (!conversation?.leadId) return;
    updateLeadMutation.mutate(
      { id: conversation.leadId, data: { status: newStatus as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/leads/${conversation.leadId}`] });
          toast({ title: "Статус обновлён", description: leadStatusLabels[newStatus] });
        },
      }
    );
  };

  const handleSaveNotes = () => {
    if (!conversation?.leadId) return;
    updateLeadMutation.mutate(
      { id: conversation.leadId, data: { notes: notesValue } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/leads/${conversation.leadId}`] });
          setEditingNotes(false);
          toast({ title: "Примечание сохранено" });
        },
      }
    );
  };

  const templatesByCategory: Record<string, typeof templates> = {};
  (templates ?? []).forEach((t) => {
    if (!templatesByCategory[t.category]) templatesByCategory[t.category] = [];
    templatesByCategory[t.category]!.push(t);
  });

  const categoryLabels: Record<string, string> = {
    general: "Общие", greeting: "Приветствие", ticket: "Авиабилет",
    hotel: "Отель", tour: "Тур", visa: "Виза", payment: "Оплата",
  };

  if (convLoading) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm">Загрузка диалога...</p>
      </div>
    </div>
  );
  if (!conversation) return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-4">
      <MessageSquare className="w-14 h-14 text-muted-foreground opacity-20" />
      <div>
        <h3 className="text-lg font-semibold">Диалог не найден</h3>
        <p className="text-sm text-muted-foreground mt-1">Возможно, диалог был удалён или ссылка устарела.</p>
      </div>
      <Link href="/conversations">
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Назад к диалогам
        </Button>
      </Link>
    </div>
  );

  const isOperatorMode = conversation.operatorMode;
  const customerName = conversation.customerName || conversation.customerPhone || "Неизвестный";

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bg-card border-b px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/conversations">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className={`w-8 h-8 rounded-full ${getAvatarColor(customerName)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
            {getInitials(customerName)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm truncate">{customerName}</span>
              <Badge variant={conversation.status === "active" ? "default" : "outline"} className="text-[10px] h-5">
                {statusLabels[conversation.status] ?? conversation.status}
              </Badge>
              {isOperatorMode && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-amber-100 text-amber-700 border-amber-200">
                  <Headset className="h-2.5 w-2.5" /> Оператор
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ChannelIcon channel={conversation.channel} className="w-3 h-3" />
              {conversation.channel === "telegram" ? "Telegram" : conversation.channel === "web" ? "Web chat" : conversation.channel}
              {conversation.createdAt && (
                <span className="ml-1">· {format(new Date(conversation.createdAt), "d MMM, HH:mm", { locale: ru })}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={refreshMessages} disabled={isRefreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Обновить сообщения</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isOperatorMode ? "default" : "outline"} size="sm"
                className={`text-xs h-8 gap-1.5 ${isOperatorMode ? "bg-amber-500 hover:bg-amber-600 text-white border-0" : ""}`}
                onClick={toggleOperatorMode} disabled={updateMutation.isPending}
              >
                {isOperatorMode ? <Shield className="w-3 h-3" /> : <Headset className="w-3 h-3" />}
                {isOperatorMode ? "Вернуть AI" : "Взять чат"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isOperatorMode ? "AI снова будет отвечать" : "Отвечать вручную"}</TooltipContent>
          </Tooltip>

          {conversation.status !== "closed" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline" size="sm" className="text-xs h-8 gap-1.5"
                  onClick={handleFollowUp} disabled={followUpMutation.isPending}
                >
                  <Zap className="w-3 h-3" />
                  {followUpMutation.isPending ? "..." : "Follow-up"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI отправит напоминание клиенту</TooltipContent>
            </Tooltip>
          )}

          {conversation.status !== "closed" && (
            <Button variant="secondary" size="sm" className="text-xs h-8 gap-1.5" onClick={handleClose} disabled={updateMutation.isPending}>
              <CheckCircle className="w-3 h-3" /> Закрыть
            </Button>
          )}
        </div>
      </header>

      {/* ── BODY: CHAT + SIDEBAR ────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* LEFT: MESSAGES */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted/20">
            {/* Start label */}
            <div className="text-center mb-4">
              <span className="text-[11px] text-muted-foreground bg-background border px-3 py-1 rounded-full">
                Диалог начат {format(new Date(conversation.createdAt), "d MMMM yyyy", { locale: ru })}
              </span>
            </div>

            {msgsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (() => {
              const msgs = messages ?? [];
              const elements: React.ReactNode[] = [];
              let lastDate: Date | null = null;

              msgs.forEach((msg, idx) => {
                const msgDate = new Date(msg.createdAt);
                const isUser = msg.role === "user";
                const isOperatorMsg = msg.role === "operator";

                // Date separator
                if (!lastDate || !isSameDay(lastDate, msgDate)) {
                  lastDate = msgDate;
                  let dateLabel = "";
                  if (isToday(msgDate)) dateLabel = "Сегодня";
                  else if (isYesterday(msgDate)) dateLabel = "Вчера";
                  else dateLabel = format(msgDate, "d MMMM", { locale: ru });

                  elements.push(
                    <div key={`sep-${idx}`} className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 bg-background border rounded-full">
                        {dateLabel}
                      </span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                  );
                }

                elements.push(
                  <div key={msg.id} className={`flex items-end gap-2 mb-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    {isUser ? (
                      <div className={`w-7 h-7 rounded-full ${getAvatarColor(customerName)} flex items-center justify-center text-white font-bold text-[10px] shrink-0 mb-0.5`}>
                        {getInitials(customerName)}
                      </div>
                    ) : isOperatorMsg ? (
                      <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 mb-0.5 text-[9px] font-bold">
                        ОП
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white shrink-0 mb-0.5 text-[9px] font-bold">
                        AI
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[72%] flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
                      {!isUser && (
                        <p className={`text-[10px] font-semibold ml-1 flex items-center gap-0.5 ${
                          isOperatorMsg ? "text-amber-600" : "text-primary"
                        }`}>
                          {isOperatorMsg
                            ? <><Headset className="w-2.5 h-2.5" /> Оператор</>
                            : <><Bot className="w-2.5 h-2.5" /> Aziz AI</>
                          }
                        </p>
                      )}
                      <div className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                          : isOperatorMsg
                          ? "bg-amber-50 border border-amber-200/80 text-foreground rounded-2xl rounded-bl-sm"
                          : "bg-white border border-slate-200 text-foreground rounded-2xl rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-muted-foreground px-1 ${isUser ? "text-right" : "text-left"}`}>
                        {format(msgDate, "HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              });

              return elements;
            })()}
            <div ref={messagesEndRef} />
          </div>

          {/* ── INPUT AREA ── */}
          {conversation.status === "closed" ? (
            <div className="px-5 py-4 bg-muted/20 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Этот диалог закрыт
            </div>
          ) : (
            <div className={`border-t shrink-0 ${isOperatorMode ? "bg-amber-50/50 border-amber-200" : "bg-background"}`}>
              {/* Mode indicator */}
              <div className={`px-4 py-1.5 flex items-center gap-1.5 border-b text-[11px] ${
                isOperatorMode
                  ? "bg-amber-100/60 border-amber-200 text-amber-700"
                  : "bg-blue-50/60 border-blue-100 text-blue-600"
              }`}>
                {isOperatorMode
                  ? <><Headset className="w-3 h-3" /> <span>Ручной режим — вы пишете клиенту напрямую</span></>
                  : <><Shield className="w-3 h-3" /> <span>AI режим — Aziz отвечает автоматически</span></>
                }
              </div>

              <div className="flex items-end gap-2.5 px-4 py-3">
                {/* Template picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="h-9 w-9 shrink-0 self-end text-muted-foreground hover:text-foreground rounded-xl"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto" side="top" align="start">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Шаблоны ответов</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(templatesByCategory).length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">Шаблонов нет. Добавьте в настройках.</div>
                    ) : (
                      Object.entries(templatesByCategory).map(([cat, items], i) => (
                        <React.Fragment key={cat}>
                          {i > 0 && <DropdownMenuSeparator />}
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {categoryLabels[cat] ?? cat}
                          </DropdownMenuLabel>
                          <DropdownMenuGroup>
                            {items?.map((t) => (
                              <DropdownMenuItem
                                key={t.id}
                                className="flex flex-col items-start gap-0.5 cursor-pointer"
                                onClick={() => setOperatorInput(t.content)}
                              >
                                <span className="font-medium text-xs">{t.title}</span>
                                <span className="text-[11px] text-muted-foreground truncate w-full">{t.content.slice(0, 55)}...</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                        </React.Fragment>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <form onSubmit={handleOperatorSend} className="flex-1 flex items-end gap-2">
                  <div className={`flex-1 flex items-end rounded-2xl border transition-colors ${
                    isOperatorMode
                      ? "border-amber-300 bg-white focus-within:border-amber-400"
                      : "border-input bg-background focus-within:border-primary/50"
                  }`}>
                    <Textarea
                      value={operatorInput}
                      onChange={(e) => setOperatorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleOperatorSend(e);
                        }
                      }}
                      placeholder={isOperatorMode ? "Напишите клиенту... (Enter — отправить)" : "Напишите сообщение..."}
                      className="flex-1 min-h-[40px] max-h-[120px] text-sm resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent px-3.5 py-2.5"
                      rows={1}
                      disabled={operatorReplyMutation.isPending}
                    />
                  </div>
                  <Button
                    type="submit" size="icon"
                    disabled={!operatorInput.trim() || operatorReplyMutation.isPending}
                    className={`h-9 w-9 shrink-0 rounded-xl ${
                      isOperatorMode
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-0"
                        : "bg-primary hover:bg-primary/90"
                    }`}
                  >
                    {operatorReplyMutation.isPending
                      ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: CLIENT INFO SIDEBAR */}
        <div className="w-72 shrink-0 border-l bg-card flex flex-col overflow-y-auto">

          {/* Client avatar + name */}
          <div className={`p-4 border-b ${isOperatorMode ? "bg-amber-50/40" : "bg-muted/20"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${getAvatarColor(customerName)} flex items-center justify-center text-white font-bold text-base shrink-0`}>
                {getInitials(customerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{customerName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ChannelIcon channel={conversation.channel} className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lead info */}
          {lead ? (
            <div className="flex-1 flex flex-col divide-y text-sm">

              {/* Status + Segment */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Статус лида</span>
                  <Select value={lead.status} onValueChange={handleLeadStatusChange} disabled={updateLeadMutation.isPending}>
                    <SelectTrigger className={`h-6 text-[11px] w-auto border px-2 py-0 rounded-full font-medium ${leadStatusColors[lead.status] ?? ""}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(leadStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Сегмент</span>
                  <Badge variant="outline" className={`text-[10px] px-2 h-5 ${
                    lead.segment === "hot" ? "bg-red-50 text-red-600 border-red-200" :
                    lead.segment === "warm" ? "bg-amber-50 text-amber-600 border-amber-200" :
                    "bg-blue-50 text-blue-600 border-blue-200"
                  }`}>
                    {lead.segment === "hot" ? <><Flame className="w-2.5 h-2.5 mr-1" />Горячий</> :
                     lead.segment === "warm" ? <><Thermometer className="w-2.5 h-2.5 mr-1" />Тёплый</> :
                     <><Snowflake className="w-2.5 h-2.5 mr-1" />Холодный</>}
                  </Badge>
                </div>
              </div>

              {/* Contact info */}
              <div className="p-4 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Контакт</p>
                {lead.phone && (
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${lead.phone}`} className="hover:text-primary transition-colors">{lead.phone}</a>
                  </div>
                )}
                {!lead.phone && (
                  <p className="text-xs text-muted-foreground/50 italic">Телефон не указан</p>
                )}
              </div>

              {/* Travel info */}
              <div className="p-4 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Путешествие</p>
                {lead.destination ? (
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{lead.destination}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">Направление не указано</p>
                )}
                {lead.budget && (
                  <div className="flex items-center gap-2 text-xs">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{lead.budget}</span>
                  </div>
                )}
                {lead.departureDate && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{lead.departureDate}</span>
                  </div>
                )}
                {lead.interest && (
                  <div className="flex items-center gap-2 text-xs">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{lead.interest}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="p-4 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Примечание</p>
                  {!editingNotes ? (
                    <button onClick={() => setEditingNotes(true)} className="text-muted-foreground hover:text-primary">
                      <Edit3 className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={handleSaveNotes} className="text-green-600 hover:text-green-700">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditingNotes(false); setNotesValue(lead.notes ?? ""); }} className="text-muted-foreground hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {editingNotes ? (
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Добавьте примечание..."
                    className="text-xs min-h-[80px] resize-none"
                    autoFocus
                  />
                ) : (
                  <p className={`text-xs leading-relaxed ${lead.notes ? "text-foreground" : "text-muted-foreground/50 italic"}`}>
                    {lead.notes || "Примечаний нет — нажмите ✎ для добавления"}
                  </p>
                )}
              </div>

              {/* Footer: open lead */}
              <div className="p-3 border-t">
                <Link href={`/leads/${lead.id}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-2">
                    <ExternalLink className="w-3 h-3" />
                    Открыть карточку лида
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2">
              <User className="w-8 h-8 opacity-20" />
              <p className="text-xs">Лид не привязан к этому диалогу</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
