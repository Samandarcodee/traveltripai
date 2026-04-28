import React, { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useSendMessage, SendMessageBodyChannel } from "@workspace/api-client-react";
import {
  Send, Bot, User, RotateCcw, Copy, Check, ExternalLink,
  Globe, Sparkles, MapPin, Plane, DollarSign, MessageSquare, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: Date;
};

const WELCOME_MSG: LocalMessage = {
  id: "welcome",
  role: "assistant",
  content: "Assalomu alaykum! Men OKSTours'ning AI menejeri **Aziz**man. 🌍\n\nSizga qaysi yo'nalishda tur paketini tanlashda yordam bera olaman. Qayerga borishni rejalashtiryapsiz?",
  time: new Date(),
};

const QUICK_SUGGESTIONS = [
  { icon: MapPin,    label: "Туры в Дубай",        text: "Дубайга turlar haqida ma'lumot bering" },
  { icon: Plane,     label: "Тур в Турцию",         text: "Turtsiyaga tur paketlari" },
  { icon: DollarSign,label: "Цены на туры",         text: "Turlar narxi qancha?" },
  { icon: Globe,     label: "Популярные направления", text: "Eng mashhur yo'nalishlar qaysilar?" },
];

const LANG_PRESETS = [
  { code: "uz", flag: "🇺🇿", label: "O'zbek",  greeting: "Salom Aziz! Sizning xizmatlaringiz haqida gapirib bering." },
  { code: "ru", flag: "🇷🇺", label: "Русский", greeting: "Привет Aziz! Расскажи о ваших турах." },
  { code: "en", flag: "🇬🇧", label: "English", greeting: "Hi Aziz! Tell me about your tour packages." },
];

/* Simple markdown parser: bold **text**, line breaks */
function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
}

export default function Chat() {
  const [messages, setMessages] = useState<LocalMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessageMutation = useSendMessage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || sendMessageMutation.isPending) return;

    const userMsg: LocalMessage = { id: Date.now().toString(), role: "user", content: text, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    sendMessageMutation.mutate(
      {
        data: {
          message: text,
          channel: SendMessageBodyChannel.web,
          conversationId,
          customerName: "Веб демо",
        },
      },
      {
        onSuccess: (data) => {
          if (data.conversationId) setConversationId(data.conversationId);
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "assistant", content: data.message, time: new Date() },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(), role: "assistant",
              content: "Извините, произошла техническая ошибка. Попробуйте ещё раз.",
              time: new Date(),
            },
          ]);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([{ ...WELCOME_MSG, time: new Date() }]);
    setConversationId(null);
    setActiveLang(null);
    textareaRef.current?.focus();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleQuickSuggest = (text: string) => {
    handleSend(undefined, text);
  };

  const handleLangPreset = (lang: (typeof LANG_PRESETS)[0]) => {
    setActiveLang(lang.code);
    handleSend(undefined, lang.greeting);
  };

  const showSuggestions = messages.length === 1;

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── MAIN CHAT ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 max-w-3xl mx-auto">

        {/* Header */}
        <header className="px-5 py-3.5 border-b bg-card flex items-center gap-3 shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">Aziz</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI агент
              </span>
            </div>
            <p className="text-xs text-muted-foreground">OKSTours Sales Manager · Онлайн</p>
          </div>

          {/* Language test buttons */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            {LANG_PRESETS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLangPreset(lang)}
                disabled={sendMessageMutation.isPending}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  activeLang === lang.code
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
                title={lang.greeting}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>

          {conversationId && (
            <Link href={`/conversations/${conversationId}`}>
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5 shrink-0">
                <ExternalLink className="w-3 h-3" />
                Диалог #{conversationId}
              </Button>
            </Link>
          )}

          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={handleReset}
            title="Новый чат"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-muted/15">

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                {isUser ? (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mb-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                  {!isUser && (
                    <span className="text-[10px] text-primary font-semibold ml-1 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Aziz AI
                    </span>
                  )}
                  <div className={`relative group px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-white border border-border/60 text-foreground rounded-bl-sm shadow-sm"
                  }`}>
                    {isUser ? msg.content : renderMarkdown(msg.content)}

                    {/* Copy button */}
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className={`absolute top-2 ${isUser ? "left-2" : "right-2"} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md ${
                        isUser ? "hover:bg-white/20" : "hover:bg-muted"
                      }`}
                    >
                      {copiedId === msg.id
                        ? <Check className="w-3 h-3 text-green-500" />
                        : <Copy className="w-3 h-3 text-muted-foreground" />
                      }
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 px-1">
                    {format(msg.time, "HH:mm")}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {sendMessageMutation.isPending && (
            <div className="flex items-end gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mb-0.5">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col gap-1 items-start">
                <span className="text-[10px] text-primary font-semibold ml-1 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Aziz AI
                </span>
                <div className="px-4 py-3.5 rounded-2xl rounded-bl-sm bg-white border border-border/60 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Quick suggestions — shown only at start */}
          {showSuggestions && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground text-center mb-3 flex items-center justify-center gap-1.5">
                <Zap className="w-3 h-3" /> Быстрые вопросы
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SUGGESTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      onClick={() => handleQuickSuggest(s.text)}
                      disabled={sendMessageMutation.isPending}
                      className="flex items-center gap-2.5 p-3 bg-white border border-border/60 rounded-xl text-left hover:bg-muted/40 hover:border-primary/30 transition-colors shadow-sm text-sm"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-xs leading-tight">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3.5 border-t bg-card shrink-0">
          {conversationId && (
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Диалог создан и сохранён в CRM
              </span>
              <Link href={`/conversations/${conversationId}`} className="text-primary hover:underline flex items-center gap-0.5">
                Открыть #{conversationId} <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-end gap-2.5">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение... (Enter — отправить, Shift+Enter — новая строка)"
                className="min-h-[44px] max-h-[120px] resize-none pr-3 py-3 text-sm rounded-2xl bg-muted/40 border-border focus-visible:ring-1 focus-visible:ring-primary/50"
                rows={1}
                disabled={sendMessageMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || sendMessageMutation.isPending}
              className="h-10 w-10 rounded-xl shrink-0"
            >
              {sendMessageMutation.isPending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
            Aziz отвечает на O'zbek · Русский · English
          </p>
        </div>
      </div>

      {/* ── RIGHT INFO PANEL ───────────────────────────────────────── */}
      <aside className="hidden xl:flex w-64 shrink-0 border-l bg-muted/10 flex-col overflow-y-auto">
        <div className="p-4 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">О демо-чате</p>
        </div>
        <div className="p-4 space-y-4 text-xs text-muted-foreground">

          <div className="space-y-2">
            <p className="font-semibold text-foreground text-[11px]">🤖 Aziz — AI агент</p>
            <p className="leading-relaxed">Продажный менеджер OKSTours. Ведёт клиента от вопроса до бронирования.</p>
          </div>

          <div className="space-y-1.5">
            <p className="font-semibold text-foreground text-[11px]">📊 Этапы продажи</p>
            {["Discovery", "Qualification", "Proposal", "Closing", "Confirmation"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="font-semibold text-foreground text-[11px]">🌍 Языки</p>
            <div className="flex gap-1.5 flex-wrap">
              {["🇺🇿 O'zbek", "🇷🇺 Русский", "🇬🇧 English"].map((l) => (
                <span key={l} className="px-2 py-0.5 bg-muted rounded-full text-[10px]">{l}</span>
              ))}
            </div>
          </div>

          <div className="border-t pt-3 space-y-1.5">
            <p className="font-semibold text-foreground text-[11px]">💡 Подсказки</p>
            <ul className="space-y-1 list-disc list-inside leading-relaxed">
              <li>Нажмите на кнопку языка для тест</li>
              <li>Все диалоги сохраняются в CRM</li>
              <li>Enter — отправить, Shift+Enter — перенос</li>
              <li>Hovering — копировать сообщение</li>
            </ul>
          </div>

          {conversationId && (
            <div className="border-t pt-3">
              <p className="font-semibold text-foreground text-[11px] mb-1.5">✅ Диалог создан</p>
              <Link href={`/conversations/${conversationId}`}>
                <button className="w-full text-left px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary text-xs font-medium transition-colors flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3" />
                  Открыть диалог #{conversationId}
                </button>
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
