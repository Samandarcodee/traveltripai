import React, { useRef, useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetConversation,
  useGetConversationMessages,
  useUpdateConversation,
  useOperatorReply,
  useSendFollowUp,
  useListTemplates,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, User, Bot, CheckCircle, Headset, Send, Zap, Shield, ChevronDown, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChannelIcon } from "@/components/channel-icon";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusLabels: Record<string, string> = {
  active: "Активный",
  pending: "Ожидание",
  closed: "Закрыт",
};

export default function ConversationDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversation, isLoading: convLoading } = useGetConversation(id, {
    query: { enabled: !!id },
  });
  const { data: messages, isLoading: msgsLoading } = useGetConversationMessages(id, {
    query: { enabled: !!id },
  });
  const { data: templates } = useListTemplates();

  const updateMutation = useUpdateConversation();
  const operatorReplyMutation = useOperatorReply();
  const followUpMutation = useSendFollowUp();

  const [operatorInput, setOperatorInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            title: newMode ? "Режим оператора включён" : "Режим AI включён",
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
          toast({ title: "Follow-up отправлен", description: "AI агент отправил follow-up сообщение." });
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Ошибка при отправке follow-up.", variant: "destructive" });
        },
      }
    );
  };

  const insertTemplate = (content: string) => {
    setOperatorInput(content);
  };

  if (convLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Загрузка...</div>;
  if (!conversation) return (
    <div className="p-12 flex flex-col items-center justify-center text-center h-full">
      <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
      <h3 className="text-lg font-semibold">Диалог не найден</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">Возможно, диалог был удалён или ссылка устарела.</p>
      <Link href="/conversations">
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Назад к диалогам
        </Button>
      </Link>
    </div>
  );

  const isOperatorMode = conversation.operatorMode;

  const templatesByCategory: Record<string, typeof templates> = {};
  (templates ?? []).forEach((t) => {
    if (!templatesByCategory[t.category]) templatesByCategory[t.category] = [];
    templatesByCategory[t.category]!.push(t);
  });

  const categoryLabels: Record<string, string> = {
    general: "Общие",
    greeting: "Приветствие",
    ticket: "Авиабилет",
    hotel: "Отель",
    tour: "Тур",
    visa: "Виза",
    payment: "Оплата",
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="bg-card border-b px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/conversations">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <ChannelIcon channel={conversation.channel} className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                {conversation.customerName || conversation.customerPhone || "Неизвестный"}
                <Badge
                  variant={conversation.status === "active" ? "default" : conversation.status === "pending" ? "secondary" : "outline"}
                  className="capitalize h-5 text-[10px]"
                >
                  {statusLabels[conversation.status] ?? conversation.status}
                </Badge>
                {isOperatorMode && (
                  <Badge variant="secondary" className="h-5 text-[10px] gap-1 bg-amber-100 text-amber-700 border-amber-200">
                    <Headset className="h-2.5 w-2.5" />
                    Режим оператора
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground capitalize">Через {conversation.channel}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.leadId && (
            <Link href={`/leads/${conversation.leadId}`}>
              <Button variant="outline" size="sm" className="text-xs h-8">Открыть лид</Button>
            </Link>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isOperatorMode ? "default" : "outline"}
                size="sm"
                className={`text-xs h-8 gap-1.5 ${isOperatorMode ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" : ""}`}
                onClick={toggleOperatorMode}
                disabled={updateMutation.isPending}
              >
                {isOperatorMode ? <Shield className="w-3 h-3" /> : <Headset className="w-3 h-3" />}
                {isOperatorMode ? "Вернуть AI" : "Режим оператора"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isOperatorMode ? "AI агент снова будет отвечать" : "Отвечайте сами"}</TooltipContent>
          </Tooltip>

          {conversation.status !== "closed" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                  onClick={handleFollowUp}
                  disabled={followUpMutation.isPending}
                >
                  <Zap className="w-3 h-3" />
                  {followUpMutation.isPending ? "..." : "Follow-up"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI отправит follow-up сообщение</TooltipContent>
            </Tooltip>
          )}

          {conversation.status !== "closed" && (
            <Button
              variant="secondary"
              size="sm"
              className="text-xs h-8"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              <CheckCircle className="w-3 h-3 mr-1.5" />
              Закрыть
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="text-center">
            <Badge variant="outline" className="bg-background text-xs">
              Диалог начат: {format(new Date(conversation.createdAt), "MMMM d, yyyy")}
            </Badge>
          </div>

          {messages?.map((msg) => {
            const isUser = msg.role === "user";
            const isOperatorMsg = msg.role === "operator";
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                      isUser ? "bg-muted text-muted-foreground" :
                      isOperatorMsg ? "bg-amber-500 text-white" :
                      "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isUser ? <User size={12} /> : isOperatorMsg ? <Headset size={12} /> : <Bot size={12} />}
                  </div>
                  <div>
                    {isOperatorMsg && (
                      <p className="text-[10px] text-amber-600 font-semibold mb-1 ml-1">Оператор</p>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl ${
                        isUser ? "bg-secondary text-secondary-foreground rounded-tr-sm" :
                        isOperatorMsg ? "bg-amber-50 border border-amber-200 rounded-tl-sm" :
                        "bg-card border shadow-sm rounded-tl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    <div className={`text-[10px] text-muted-foreground mt-1 flex ${isUser ? "justify-end" : "justify-start"}`}>
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {conversation.status !== "closed" && (
        <div className={`px-6 py-3 border-t ${isOperatorMode ? "bg-amber-50 border-amber-200" : "bg-muted/30 border-border"}`}>
          {!isOperatorMode && (
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-blue-500" />
                AI агент отвечает автоматически. При отправке включится режим оператора.
              </p>
            </div>
          )}
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="flex items-center gap-2">
              <FileText className={`h-3.5 w-3.5 shrink-0 ${isOperatorMode ? "text-amber-600" : "text-muted-foreground"}`} />
              <span className={`text-xs font-medium mr-1 ${isOperatorMode ? "text-amber-700" : "text-muted-foreground"}`}>Шаблоны:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-amber-300 bg-white hover:bg-amber-50">
                    Выбрать шаблон <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto">
                  {Object.keys(templatesByCategory).length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Шаблонов нет. Добавьте в настройках.
                    </div>
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
                              onClick={() => insertTemplate(t.content)}
                            >
                              <span className="font-medium text-xs">{t.title}</span>
                              <span className="text-[11px] text-muted-foreground truncate w-full">{t.content.slice(0, 60)}...</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </React.Fragment>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-[11px] text-amber-600/70 ml-1">Выберите шаблон — текст вставится в поле</span>
            </div>

            <form onSubmit={handleOperatorSend} className="flex gap-2">
              <div className="flex items-center gap-2 mr-2 shrink-0">
                <Headset className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Оператор</span>
              </div>
              <Textarea
                value={operatorInput}
                onChange={(e) => setOperatorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleOperatorSend(e);
                  }
                }}
                placeholder="Напишите сообщение клиенту... (Shift+Enter — новая строка)"
                className={`flex-1 bg-white min-h-[70px] max-h-[140px] text-sm resize-none ${isOperatorMode ? "border-amber-200 focus-visible:ring-amber-400" : ""}`}
                disabled={operatorReplyMutation.isPending}
                rows={2}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!operatorInput.trim() || operatorReplyMutation.isPending}
                className={`self-end ${isOperatorMode ? "bg-amber-500 hover:bg-amber-600 text-white border-0" : "bg-primary hover:bg-primary/90 text-white border-0"}`}
              >
                {operatorReplyMutation.isPending ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {conversation.status === "closed" && (
        <div className="p-3 bg-muted text-center border-t text-sm text-muted-foreground">
          Этот диалог закрыт.
        </div>
      )}
    </div>
  );
}
