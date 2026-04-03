import React, { useRef, useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetConversation,
  useGetConversationMessages,
  useUpdateConversation,
  useOperatorReply,
  useSendFollowUp,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, User, Bot, CheckCircle, Headset, Send, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChannelIcon } from "@/components/channel-icon";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
            title: newMode ? "Operator rejimi yoqildi" : "AI rejimi yoqildi",
            description: newMode
              ? "Endi siz mijozga o'zingiz javob berasiz."
              : "AI agent yana avtomatik javob beradi.",
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
          toast({ title: "Xatolik", description: "Xabar yuborishda xatolik.", variant: "destructive" });
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
          toast({
            title: "Follow-up yuborildi",
            description: "AI agent follow-up xabarini yubordi.",
          });
        },
        onError: () => {
          toast({ title: "Xatolik", description: "Follow-up yuborishda xatolik.", variant: "destructive" });
        },
      }
    );
  };

  if (convLoading || msgsLoading) return <div className="p-8 text-center animate-pulse">Yuklanmoqda...</div>;
  if (!conversation) return <div className="p-8 text-center">Suhbat topilmadi</div>;

  const isOperatorMode = conversation.operatorMode;

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
                {conversation.customerName || conversation.customerPhone || "Noma'lum"}
                <Badge
                  variant={conversation.status === "active" ? "default" : conversation.status === "pending" ? "secondary" : "outline"}
                  className="capitalize h-5 text-[10px]"
                >
                  {conversation.status}
                </Badge>
                {isOperatorMode && (
                  <Badge variant="secondary" className="h-5 text-[10px] gap-1 bg-amber-100 text-amber-700 border-amber-200">
                    <Headset className="h-2.5 w-2.5" />
                    Operator rejimi
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground capitalize">Via {conversation.channel}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.leadId && (
            <Link href={`/leads/${conversation.leadId}`}>
              <Button variant="outline" size="sm" className="text-xs h-8">
                Lidni ko'rish
              </Button>
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
                {isOperatorMode ? "AI ga qaytarish" : "Operator rejimi"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isOperatorMode ? "AI agent yana javob bersin" : "Siz o'zingiz javob bering"}
            </TooltipContent>
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
              <TooltipContent>AI follow-up xabar yuboradi</TooltipContent>
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
              Yopish
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="text-center">
            <Badge variant="outline" className="bg-background text-xs">
              Suhbat boshlangan: {format(new Date(conversation.createdAt), "MMMM d, yyyy")}
            </Badge>
          </div>

          {messages?.map((msg) => {
            const isUser = msg.role === "user";
            const isOperatorMsg = msg.role === "operator";

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[85%] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                      isUser
                        ? "bg-muted text-muted-foreground"
                        : isOperatorMsg
                        ? "bg-amber-500 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isUser ? <User size={12} /> : isOperatorMsg ? <Headset size={12} /> : <Bot size={12} />}
                  </div>
                  <div>
                    {isOperatorMsg && (
                      <p className="text-[10px] text-amber-600 font-semibold mb-1 ml-1">Operator</p>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl ${
                        isUser
                          ? "bg-secondary text-secondary-foreground rounded-tr-sm"
                          : isOperatorMsg
                          ? "bg-amber-50 border border-amber-200 rounded-tl-sm"
                          : "bg-card border shadow-sm rounded-tl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    <div
                      className={`text-[10px] text-muted-foreground mt-1 flex ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
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

      {conversation.status !== "closed" && isOperatorMode && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-200">
          <form onSubmit={handleOperatorSend} className="flex gap-2 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mr-2 shrink-0">
              <Headset className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Operator</span>
            </div>
            <Input
              value={operatorInput}
              onChange={(e) => setOperatorInput(e.target.value)}
              placeholder="Mijozga xabar yozing..."
              className="flex-1 bg-white border-amber-200 focus-visible:ring-amber-400"
              disabled={operatorReplyMutation.isPending}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!operatorInput.trim() || operatorReplyMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {conversation.status === "closed" && (
        <div className="p-3 bg-muted text-center border-t text-sm text-muted-foreground">
          Bu suhbat yopilgan.
        </div>
      )}
    </div>
  );
}
