import React, { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useTestTelegramBot,
  useTelegramAccountConnect,
  useTelegramAccountVerify,
  useTelegramAccountVerify2fa,
  useTelegramAccountDisconnect,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2, User, Send, Bot, Bell, Phone, KeyRound, ShieldCheck,
  Loader2, Info, LogOut, ArrowRight, Hash, CheckCircle2, XCircle,
  Eye, EyeOff, Globe, Zap, BrainCircuit, Languages, Copy,
  Volume2, VolumeX, MonitorSmartphone, Activity, Plug,
  ChevronRight, FlaskConical,
} from "lucide-react";

type Tab = "company" | "ai_agent" | "telegram_bot" | "telegram_account" | "notifications";
type AuthStep = "idle" | "entering_phone" | "waiting_code" | "waiting_2fa" | "connected";

const TABS: { id: Tab; icon: React.ElementType; label: string; description: string }[] = [
  { id: "company",           icon: Building2,       label: "Компания",          description: "Название, оператор" },
  { id: "ai_agent",          icon: BrainCircuit,    label: "AI Агент",          description: "Aziz, промпт" },
  { id: "telegram_bot",      icon: Send,            label: "Telegram Bot",      description: "Bot token, webhook" },
  { id: "telegram_account",  icon: Phone,           label: "Tg. Аккаунт",       description: "MTProto аккаунт" },
  { id: "notifications",     icon: Bell,            label: "Уведомления",       description: "Звук, браузер" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("company");
  const { data: settings, isLoading, refetch } = useGetSettings();
  const updateMutation = useUpdateSettings();
  const testBotMutation = useTestTelegramBot();
  const connectMutation = useTelegramAccountConnect();
  const verifyMutation = useTelegramAccountVerify();
  const verify2faMutation = useTelegramAccountVerify2fa();
  const disconnectMutation = useTelegramAccountDisconnect();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Company
  const [companyName, setCompanyName] = useState("");
  const [operatorName, setOperatorName] = useState("");

  // Telegram Bot
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; botUsername?: string; botName?: string; error?: string } | null>(null);

  // Telegram Account (MTProto)
  const [authStep, setAuthStep] = useState<AuthStep>("idle");
  const [phone, setPhone] = useState("+998");
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [code, setCode] = useState("");
  const [twoFaPass, setTwoFaPass] = useState("");

  // Notifications (localStorage)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("oks_sound") !== "false");
  const [browserNotif, setBrowserNotif] = useState(() => localStorage.getItem("oks_browser_notif") === "true");

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName ?? "");
      setOperatorName(settings.operatorName ?? "");
      if (settings.telegramAccountConnected) setAuthStep("connected");
    }
  }, [settings]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    refetch();
  };

  /* ── Company ───────────────────────────────────────────────────── */
  const handleSaveCompany = () => {
    updateMutation.mutate(
      { data: { operatorName: operatorName || null, companyName: companyName || null } },
      {
        onSuccess: () => { invalidate(); toast({ title: "✓ Сохранено", description: "Настройки компании обновлены" }); },
        onError: () => toast({ title: "Ошибка", variant: "destructive" }),
      }
    );
  };

  /* ── Telegram Bot ──────────────────────────────────────────────── */
  const handleTestBot = () => {
    setTestResult(null);
    testBotMutation.mutate(
      {},
      {
        onSuccess: (res) => setTestResult(res as any),
        onError: () => setTestResult({ ok: false, error: "Ошибка сервера" }),
      }
    );
  };

  const handleSaveBot = () => {
    updateMutation.mutate(
      { data: { telegramBotToken: botToken || null } },
      {
        onSuccess: () => {
          invalidate();
          setTestResult(null);
          toast({ title: "✓ Bot token сохранён" });
        },
        onError: () => toast({ title: "Ошибка", variant: "destructive" }),
      }
    );
  };

  const handleCopyWebhook = () => {
    const url = `${window.location.origin}/api/telegram/webhook`;
    navigator.clipboard.writeText(url);
    toast({ title: "Скопировано", description: url });
  };

  /* ── Telegram Account ──────────────────────────────────────────── */
  const handleSendCode = () => {
    if (!phone.trim() || !apiId.trim() || !apiHash.trim()) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }
    connectMutation.mutate(
      { data: { phone: phone.trim(), apiId: parseInt(apiId), apiHash: apiHash.trim() } },
      {
        onSuccess: (res) => {
          if (res.status === "code_sent") {
            setAuthStep("waiting_code");
            toast({ title: "Код отправлен", description: `На ${phone}` });
          } else {
            toast({ title: "Ошибка", description: res.error ?? "Не удалось подключиться", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Ошибка сервера", variant: "destructive" }),
      }
    );
  };

  const handleVerifyCode = () => {
    verifyMutation.mutate(
      { data: { code: code.trim() } },
      {
        onSuccess: (res) => {
          if (res.status === "connected") {
            setAuthStep("connected");
            invalidate();
            toast({ title: "✓ Подключено!", description: "Telegram аккаунт активирован" });
          } else if (res.status === "need_password") {
            setAuthStep("waiting_2fa");
          } else {
            toast({ title: "Ошибка", description: res.error ?? "Неверный код", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Ошибка", variant: "destructive" }),
      }
    );
  };

  const handleVerify2FA = () => {
    verify2faMutation.mutate(
      { data: { password: twoFaPass } },
      {
        onSuccess: (res) => {
          if (res.status === "connected") {
            setAuthStep("connected");
            invalidate();
            toast({ title: "✓ Подключено!" });
          } else {
            toast({ title: "Ошибка", description: res.error ?? "Неверный пароль", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Ошибка", variant: "destructive" }),
      }
    );
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(
      {},
      {
        onSuccess: () => {
          setAuthStep("idle");
          setPhone("+998");
          setApiId(""); setApiHash(""); setCode(""); setTwoFaPass("");
          invalidate();
          toast({ title: "Аккаунт отключён" });
        },
      }
    );
  };

  /* ── Notifications ─────────────────────────────────────────────── */
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("oks_sound", String(next));
    toast({ title: next ? "🔔 Звук включён" : "🔕 Звук выключен" });
  };

  const toggleBrowserNotif = async () => {
    if (!browserNotif) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast({ title: "Разрешение не дано", description: "Разрешите уведомления в браузере", variant: "destructive" });
        return;
      }
    }
    const next = !browserNotif;
    setBrowserNotif(next);
    localStorage.setItem("oks_browser_notif", String(next));
    toast({ title: next ? "Уведомления браузера включены" : "Уведомления браузера выключены" });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isBotConnected = settings?.telegramBotConnected;
  const isAccConnected = settings?.telegramAccountConnected || authStep === "connected";

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col overflow-y-auto">
        <div className="px-4 py-5 border-b">
          <h1 className="text-lg font-bold tracking-tight">Настройки</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Конфигурация системы</p>
        </div>
        <nav className="p-2 flex-1 space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            let statusDot = null;
            if (tab.id === "telegram_bot") {
              statusDot = (
                <span className={`w-2 h-2 rounded-full shrink-0 ${isBotConnected ? "bg-green-500" : "bg-slate-300"}`} />
              );
            }
            if (tab.id === "telegram_account") {
              statusDot = (
                <span className={`w-2 h-2 rounded-full shrink-0 ${isAccConnected ? "bg-green-500" : "bg-slate-300"}`} />
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors group ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${isActive ? "text-primary-foreground" : ""}`}>
                    {tab.label}
                  </p>
                  <p className={`text-[10px] leading-tight truncate ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {tab.description}
                  </p>
                </div>
                {statusDot}
              </button>
            );
          })}
        </nav>

        {/* System info */}
        <div className="p-3 border-t">
          <div className="text-[10px] text-muted-foreground/60 space-y-0.5">
            <p className="flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> OKSTours AI v1.0</p>
            <p className="flex items-center gap-1"><Globe className="w-2.5 h-2.5" />
              {isBotConnected || isAccConnected ? "Онлайн" : "Оффлайн"}
            </p>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-8 py-7">

        {/* ══ КОМПАНИЯ ══════════════════════════════════════════════ */}
        {activeTab === "company" && (
          <Section icon={Building2} title="Компания" description="Основная информация об агентстве">
            <div className="space-y-5 max-w-md">
              <Field label="Название компании" icon={Building2} hint="Отображается в сообщениях AI агента">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="OKSTours"
                />
              </Field>

              <Field label="Имя оператора" icon={User} hint="Имя, от которого AI подписывает сообщения">
                <Input
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Например: Сардор"
                />
              </Field>

              <Button
                onClick={handleSaveCompany}
                disabled={updateMutation.isPending}
                className="w-full"
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Сохранение...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Сохранить</>
                )}
              </Button>
            </div>
          </Section>
        )}

        {/* ══ AI АГЕНТ ══════════════════════════════════════════════ */}
        {activeTab === "ai_agent" && (
          <Section icon={BrainCircuit} title="AI Агент — Aziz" description="Конфигурация AI агента OKSTours">
            <div className="space-y-5 max-w-lg">

              {/* Agent card */}
              <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-bold">Aziz</p>
                  <p className="text-sm text-muted-foreground">OKSTours AI Sales Manager</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    <span className="text-xs text-green-600 font-medium">Активен</span>
                  </div>
                </div>
              </div>

              {/* Languages */}
              <InfoBlock icon={Languages} title="Поддерживаемые языки">
                <div className="flex gap-2 flex-wrap mt-2">
                  {["🇺🇿 O'zbek", "🇷🇺 Русский", "🇬🇧 English"].map((lang) => (
                    <span key={lang} className="text-xs px-2.5 py-1 bg-muted rounded-full font-medium">{lang}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Aziz автоматически определяет язык клиента и отвечает на том же языке.
                </p>
              </InfoBlock>

              {/* Sales stages */}
              <InfoBlock icon={Zap} title="Воронка продаж">
                <div className="mt-2 space-y-1.5">
                  {[
                    ["1. DISCOVERY",      "Понять что хочет клиент"],
                    ["2. QUALIFICATION",  "Уточнить направление, даты, бюджет"],
                    ["3. PROPOSAL",       "Предложить 2-3 варианта с ценой"],
                    ["4. CLOSING",        "Мотивировать к бронированию"],
                    ["5. CONFIRMATION",   "Оформить бронь и получить контакты"],
                  ].map(([stage, desc]) => (
                    <div key={stage} className="flex items-start gap-2 text-xs">
                      <span className="font-mono font-bold text-primary shrink-0 w-28">{stage}</span>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </InfoBlock>

              {/* System prompt preview */}
              <InfoBlock icon={FlaskConical} title="Системный промпт">
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border text-xs font-mono text-muted-foreground leading-relaxed max-h-36 overflow-y-auto">
                  Siz OKSTours kompaniyasining professional SOTUV MENEJERI AI agentsiz.
                  Sizning asosiy vazifangiz — har bir mijozni BRON QILISHGACHA olib borish.
                  <br/><br/>
                  Ismingiz: Aziz (OKSTours menejeri)<br/>
                  Uslub: Do'stona, ishonchli, professional, savdo yo'naltirilgan<br/>
                  Til: Mijoz qaysi tilda yozsa — o'sha tilda javob bering
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Промпт задан в исходном коде системы. Для изменений обратитесь к разработчику.
                </p>
              </InfoBlock>
            </div>
          </Section>
        )}

        {/* ══ TELEGRAM BOT ══════════════════════════════════════════ */}
        {activeTab === "telegram_bot" && (
          <Section icon={Send} title="Telegram Bot" description="Webhook интеграция через официальный Bot API">

            {/* Status */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${
              isBotConnected
                ? "bg-green-50 border-green-200"
                : "bg-muted/30 border-border"
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isBotConnected ? "bg-green-500" : "bg-slate-300"
              }`}>
                <Send className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${isBotConnected ? "text-green-800" : "text-muted-foreground"}`}>
                  {isBotConnected ? `@${settings?.telegramBotUsername} подключён` : "Bot не подключён"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBotConnected
                    ? "Входящие сообщения через бота обрабатываются AI агентом"
                    : "Введите Bot Token для активации"}
                </p>
              </div>
              {isBotConnected ? (
                <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Активен</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground"><XCircle className="w-3 h-3 mr-1" />Не активен</Badge>
              )}
            </div>

            <div className="space-y-5 max-w-lg">
              <Field label="Bot Token" icon={KeyRound}
                hint={<>Получите token у <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline text-primary">@BotFather</a> в Telegram</>}
              >
                <div className="relative">
                  <Input
                    value={botToken}
                    onChange={(e) => { setBotToken(e.target.value); setTestResult(null); }}
                    type={showToken ? "text" : "password"}
                    placeholder={settings?.telegramBotToken ? "••••••...••••" : "123456789:ABCDEFGHabcdefgh..."}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex gap-2">
                <Button
                  variant="outline" className="flex-1 gap-2"
                  onClick={handleTestBot}
                  disabled={testBotMutation.isPending}
                >
                  {testBotMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Проверка...</>
                    : <><FlaskConical className="w-4 h-4" />Тест соединения</>
                  }
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleSaveBot}
                  disabled={updateMutation.isPending || !botToken.trim()}
                >
                  {updateMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Сохранение...</>
                    : <><CheckCircle2 className="w-4 h-4" />Сохранить</>
                  }
                </Button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${
                  testResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  {testResult.ok
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                    : <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  }
                  <div>
                    {testResult.ok
                      ? <><span className="font-semibold">✓ Успешно!</span> Bot: @{testResult.botUsername} ({testResult.botName})</>
                      : <><span className="font-semibold">Ошибка:</span> {testResult.error}</>
                    }
                  </div>
                </div>
              )}

              {/* Webhook URL */}
              <InfoBlock icon={Globe} title="Webhook URL">
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono border text-muted-foreground truncate">
                    {window.location.origin}/api/telegram/webhook
                  </code>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyWebhook}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Установите этот URL в настройках вашего бота через @BotFather командой <code className="bg-muted px-1 rounded">/setwebhook</code>.
                </p>
              </InfoBlock>
            </div>
          </Section>
        )}

        {/* ══ TELEGRAM ACCOUNT ══════════════════════════════════════ */}
        {activeTab === "telegram_account" && (
          <Section icon={Phone} title="Telegram Аккаунт" description="Подключение личного аккаунта через MTProto">

            {/* Connected state */}
            {isAccConnected && (
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="h-10 w-10 rounded-full bg-[#229ED9] flex items-center justify-center shrink-0">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-800">Аккаунт подключён</p>
                    {settings?.telegramAccountPhone && (
                      <p className="text-xs text-green-700 font-mono">{settings.telegramAccountPhone}</p>
                    )}
                    <p className="text-xs text-green-600 mt-0.5">
                      Входящие сообщения обрабатываются AI агентом автоматически
                    </p>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="text-red-600 hover:text-red-700 shrink-0 gap-1.5"
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                    Отключить
                  </Button>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2 text-sm text-blue-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Все входящие личные сообщения обрабатываются Aziz. Включите «Режим оператора» в Диалогах для ручных ответов.</p>
                </div>
              </div>
            )}

            {/* Not connected */}
            {!isAccConnected && authStep === "idle" && (
              <div className="space-y-5 max-w-lg">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <p className="font-semibold flex items-center gap-1.5 mb-2">
                    <Info className="h-4 w-4" /> Перед подключением
                  </p>
                  <p>
                    Получите{" "}
                    <a href="https://my.telegram.org/apps" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      API ID и API Hash
                    </a>{" "}
                    на сайте my.telegram.org/apps
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="API ID" icon={Hash}>
                    <Input
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value.replace(/\D/g, ""))}
                      placeholder="12345678"
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label="API Hash" icon={KeyRound}>
                    <Input
                      value={apiHash}
                      onChange={(e) => setApiHash(e.target.value)}
                      placeholder="a1b2c3d4..."
                    />
                  </Field>
                </div>

                <Field label="Номер телефона" icon={Phone} hint="Международный формат (+998, +7...)">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998901234567"
                    type="tel"
                  />
                </Field>

                <Button
                  className="w-full gap-2"
                  onClick={handleSendCode}
                  disabled={connectMutation.isPending || !phone || !apiId || !apiHash}
                >
                  {connectMutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Подключение...</>
                    : <><Send className="h-4 w-4" />Отправить код<ArrowRight className="h-4 w-4 ml-auto" /></>
                  }
                </Button>

                {/* How it works */}
                <div className="border rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold">Как работает интеграция?</p>
                  {[
                    "Получите API ID и API Hash на my.telegram.org/apps",
                    "Введите номер телефона — придёт код Telegram",
                    "Введите код — аккаунт будет подключён",
                    "Все входящие ЛС обрабатываются AI агентом Aziz",
                    "Диалоги появятся в разделе «Диалоги»",
                    "В режиме оператора — отвечайте самостоятельно",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 font-bold">
                        {i + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiting code */}
            {!isAccConnected && authStep === "waiting_code" && (
              <div className="space-y-4 max-w-sm">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-1">
                  <div className="text-2xl">📱</div>
                  <p className="font-semibold text-sm">Код отправлен на {phone}</p>
                  <p className="text-xs text-muted-foreground">Проверьте Telegram — там 5-значный код</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Код подтверждения</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="12345"
                    maxLength={6}
                    inputMode="numeric"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAuthStep("idle")}>Назад</Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleVerifyCode}
                    disabled={verifyMutation.isPending || code.length < 4}
                  >
                    {verifyMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Проверка...</> : <><CheckCircle2 className="h-4 w-4" />Подтвердить</>}
                  </Button>
                </div>
              </div>
            )}

            {/* Waiting 2FA */}
            {!isAccConnected && authStep === "waiting_2fa" && (
              <div className="space-y-4 max-w-sm">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center space-y-1">
                  <div className="text-2xl">🔐</div>
                  <p className="font-semibold text-sm">Двухфакторная аутентификация</p>
                  <p className="text-xs text-muted-foreground">Введите пароль 2FA вашего Telegram</p>
                </div>
                <Field label="Пароль 2FA" icon={ShieldCheck}>
                  <Input
                    value={twoFaPass}
                    onChange={(e) => setTwoFaPass(e.target.value)}
                    type="password"
                    placeholder="Ваш пароль..."
                    autoFocus
                  />
                </Field>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAuthStep("idle")}>Отмена</Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleVerify2FA}
                    disabled={verify2faMutation.isPending || !twoFaPass}
                  >
                    {verify2faMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Проверка...</> : <><ShieldCheck className="h-4 w-4" />Войти</>}
                  </Button>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ══ NOTIFICATIONS ═════════════════════════════════════════ */}
        {activeTab === "notifications" && (
          <Section icon={Bell} title="Уведомления" description="Настройки оповещений для оператора">
            <div className="space-y-4 max-w-md">

              <ToggleRow
                icon={Volume2}
                title="Звуковые уведомления"
                description="Звук при новом диалоге от клиента"
                enabled={soundEnabled}
                onToggle={toggleSound}
              />

              <ToggleRow
                icon={MonitorSmartphone}
                title="Уведомления браузера"
                description="Push-уведомления даже когда вкладка закрыта"
                enabled={browserNotif}
                onToggle={toggleBrowserNotif}
              />

              <div className="p-4 bg-muted/40 rounded-xl border space-y-2 mt-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Plug className="w-4 h-4 text-muted-foreground" />
                  Статус интеграций
                </p>
                <StatusRow label="AI Агент Aziz" connected={true} />
                <StatusRow label="Telegram Bot" connected={!!isBotConnected} />
                <StatusRow label="Telegram Аккаунт (MTProto)" connected={!!isAccConnected} />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-700">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>Настройки уведомлений сохраняются только в этом браузере. На другом устройстве необходимо настроить заново.</p>
              </div>
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

/* ── Utility Components ──────────────────────────────────────────── */

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, icon: Icon, hint, children }: {
  label: string;
  icon: React.ElementType;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function InfoBlock({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-xl p-4">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-muted-foreground" /> {title}
      </p>
      {children}
    </div>
  );
}

function ToggleRow({ icon: Icon, title, description, enabled, onToggle }: {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-muted"}`}>
          <Icon className={`w-4 h-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-input"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function StatusRow({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 text-xs font-medium ${connected ? "text-green-600" : "text-muted-foreground"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-slate-300"}`} />
        {connected ? "Подключено" : "Не подключено"}
      </span>
    </div>
  );
}
