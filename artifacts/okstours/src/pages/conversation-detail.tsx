import React, { useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetConversation, useGetConversationMessages, useUpdateConversation } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowLeft, User, Bot, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon } from "@/components/channel-icon";
import { useQueryClient } from "@tanstack/react-query";

export default function ConversationDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();

  const { data: conversation, isLoading: convLoading } = useGetConversation(id, { 
    query: { enabled: !!id } 
  });
  
  const { data: messages, isLoading: msgsLoading } = useGetConversationMessages(id, { 
    query: { enabled: !!id } 
  });

  const updateMutation = useUpdateConversation();
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
        }
      }
    );
  };

  if (convLoading || msgsLoading) return <div className="p-8 text-center animate-pulse">Loading...</div>;
  if (!conversation) return <div className="p-8 text-center">Conversation not found</div>;

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="bg-card border-b px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/conversations">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <ChannelIcon channel={conversation.channel} className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                {conversation.customerName || conversation.customerPhone || "Anonymous"}
                <Badge variant={conversation.status === 'active' ? 'default' : conversation.status === 'pending' ? 'secondary' : 'outline'} className="capitalize h-5 text-[10px]">
                  {conversation.status}
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground capitalize">Via {conversation.channel}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation.leadId && (
            <Link href={`/leads/${conversation.leadId}`}>
              <Button variant="outline" size="sm">View Lead</Button>
            </Link>
          )}
          {conversation.status !== "closed" && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Closed
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <Badge variant="outline" className="bg-background">
              Conversation Started {format(new Date(conversation.createdAt), "MMMM d, yyyy")}
            </Badge>
          </div>
          
          {messages?.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[85%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  msg.role === "user" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                }`}>
                  {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div>
                  <div className={`p-4 rounded-2xl ${
                    msg.role === "user" 
                      ? "bg-secondary text-secondary-foreground rounded-tr-sm" 
                      : "bg-card border shadow-sm rounded-tl-sm"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  <div className={`text-[10px] text-muted-foreground mt-1 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {format(new Date(msg.createdAt), "h:mm a")}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {conversation.status === "closed" && (
        <div className="p-3 bg-muted text-center border-t text-sm text-muted-foreground">
          This conversation is closed.
        </div>
      )}
    </div>
  );
}
