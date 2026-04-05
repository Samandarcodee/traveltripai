import React, { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, useTestTelegramBot } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Settings2,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCcw,
  Info,
  Bot,
  Building2,
  User,
  Webhook,
  Copy,
  Check,
} from "lucide-react";

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateMutation = useUpdateSettings();
  const testMutation = useTestTelegramBot();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (settings) {
      setOperatorName(settings.operatorName ?? "");
      setCompanyName(settings.companyName ?? "");
    }
  }, [settings]);

  const webhookUrl = `${window.location.origin.replace("20738", "8080")}/api/telegram/webhook`;
  const webhookForDisplay = webhookUrl;

  const handleSaveToken = () => {
    if (!tokenInput.trim()) {
      toast({ title: "Xatolik", description: "Bot token kiritilmagan", variant: "destructive" });
      return;
    }
    updateMutation.mutate(
      { data: { telegramBotToken: tokenInput.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
          setTokenInput("");
          toast({ title: "Saqlandi", description: "Bot token muvaffaqiyatli saqlandi." });
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  const handleTestBot = () => {
    testMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          if (data.ok) {
            queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
            toast({ title: "Ulandi!", description: `Bot: @${data.botUsername} (${data.botName})` });
          } else {
            toast({ title: "Ulanmadi", description: data.error ?? "Xatolik", variant: "destructive" });
          }
        },
      }
    );
  };

  const handleDisconnect = () => {
    updateMutation.mutate(
      { data: { telegramBotToken: null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
          toast({ title: "Uzildi", description: "Telegram bot o'chirildi." });
        },
      }
    );
  };

  const handleSaveGeneral = () => {
    updateMutation.mutate(
      { data: { operatorName: operatorName || null, companyName: companyName || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
          toast({ title: "Saqlandi", description: "Sozlamalar yangilandi." });
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookForDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Yuklanmoqda...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-primary" />
          Sozlamalar
        </h1>
        <p className="text-muted-foreground mt-1">Telegram bot va umumiy tizim sozlamalari.</p>
      </div>

      {/* Telegram Integration */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-5 w-5 text-[#229ED9]" />
            Telegram Bot Integratsiyasi
            {settings?.telegramConnected ? (
              <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ulangan
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto text-muted-foreground">
                <XCircle className="h-3 w-3 mr-1" />
                Ulanmagan
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {settings?.telegramConnected && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Bot className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">
                  @{settings.telegramBotUsername} bilan ulangan
                </p>
                <p className="text-xs text-green-600 truncate">Token: {settings.telegramBotToken}</p>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 shrink-0" onClick={handleDisconnect}>
                Uzish
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Bot Token
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-primary hover:underline inline-flex items-center gap-0.5"
              >
                @BotFather da olish
                <ExternalLink className="h-3 w-3" />
              </a>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  type={showToken ? "text" : "password"}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ..."
                  className="pr-10"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveToken} disabled={!tokenInput.trim() || updateMutation.isPending}>
                Saqlash
              </Button>
            </div>
          </div>

          {settings?.telegramBotToken && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleTestBot}
                disabled={testMutation.isPending}
              >
                <RefreshCcw className={`h-4 w-4 ${testMutation.isPending ? "animate-spin" : ""}`} />
                {testMutation.isPending ? "Tekshirilmoqda..." : "Botni tekshirish"}
              </Button>
            </div>
          )}

          {/* Webhook setup instructions */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 flex items-center gap-2 border-b">
              <Webhook className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Webhook sozlash</span>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Bot token saqlangandan so'ng Telegram webhook ni quyidagi URL ga sozlang:
              </p>
              <div className="bg-muted/50 rounded-md p-3 font-mono text-xs break-all flex items-start gap-2">
                <span className="flex-1 text-foreground">{webhookForDisplay}</span>
                <button onClick={copyWebhook} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Webhook ni o'rnatish yo'llari:</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex gap-2 items-start">
                    <span className="font-bold text-primary shrink-0">1.</span>
                    <p>
                      <strong>Avtomatik:</strong> "Botni tekshirish" tugmasini bosganingizda webhook avtomatik o'rnatiladi (agar server public bo'lsa).
                    </p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="font-bold text-primary shrink-0">2.</span>
                    <p>
                      <strong>Qo'lda:</strong> Brauzerda quyidagi URL ni oching:
                      <code className="block mt-1 text-xs bg-muted p-1.5 rounded break-all">
                        {`https://api.telegram.org/bot<TOKEN>/setWebhook?url=${webhookForDisplay}`}
                      </code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Telegram bot ulangandan so'ng, bot sizga yuborilgan har bir xabarni AI agent orqali avtomatik javob beradi.
              Suhbatlar panelida "Operator rejimi" ni yoqib, o'zingiz ham javob berishingiz mumkin.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Umumiy Sozlamalar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Kompaniya nomi
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="OKSTours"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Operator ismi (AI xabarlarda ko'rinadi)
            </label>
            <Input
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Masalan: Sardor"
            />
          </div>
          <Button onClick={handleSaveGeneral} disabled={updateMutation.isPending} className="w-full">
            {updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </CardContent>
      </Card>

      {/* How Telegram works */}
      <Card className="border-dashed shadow-none">
        <CardContent className="py-5">
          <h3 className="text-sm font-semibold mb-3">Telegram qanday ishlaydi?</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            {[
              "Foydalanuvchi Telegram botga xabar yozadi",
              "Telegram xabarni bizning serverga webhook orqali yuboradi",
              "AI agent xabarni o'qib, javob tayyorlaydi",
              "Javob Telegram orqali foydalanuvchiga yuboriladi",
              "Suhbatlar panelida bu muloqot ko'rinadi",
              "Operator rejimida operator o'zi javob berishi mumkin",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
