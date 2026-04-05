import React, { useState, useRef, useEffect } from "react";
import { useSendMessage, SendMessageBodyChannel } from "@workspace/api-client-react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<LocalMessage[]>([
    { id: "1", role: "assistant", content: "Здравствуйте! Я AI ассистент OKSTours. Как я могу помочь вам спланировать путешествие?" }
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessageMutation = useSendMessage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMessageMutation.isPending) return;

    const userMsg: LocalMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    sendMessageMutation.mutate(
      {
        data: {
          message: userMsg.content,
          channel: SendMessageBodyChannel.web,
          conversationId,
          customerName: "Веб демо пользователь"
        }
      },
      {
        onSuccess: (data) => {
          if (data.conversationId) setConversationId(data.conversationId);
          setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: data.message }]);
        },
        onError: () => {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "Извините, произошла ошибка при подключении к серверу." }]);
        }
      }
    );
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto bg-card border-x border-border shadow-sm">
      <div className="p-4 border-b border-border bg-secondary text-secondary-foreground flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-bold">OKSTours Ассистент</h2>
          <p className="text-xs opacity-80">Веб демо</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[80%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
              }`}>
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl ${
                msg.role === "user" 
                  ? "bg-secondary text-secondary-foreground rounded-tr-sm" 
                  : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        {sendMessageMutation.isPending && (
          <div className="flex justify-start">
            <div className="flex max-w-[80%] gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border text-foreground rounded-tl-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-card border-t border-border">
        <form onSubmit={handleSend} className="flex gap-2 relative">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите сообщение AI..." 
            className="flex-1 pr-12 rounded-full bg-muted/50 border-border focus-visible:ring-primary"
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="absolute right-1 top-1 bottom-1 h-8 w-8 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
