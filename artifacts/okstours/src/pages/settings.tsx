import React, { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useTelegramAccountConnect,
  useTelegramAccountVerify,
  useTelegramAccountVerify2fa,
  useTelegramAccountDisconnect,
} from "@workspace/api-client-react";
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
  Building2,
  User,
  Phone,
  KeyRound,
  ShieldCheck,
  Loader2,
  Info,
  LogOut,
  ArrowRight,
  Hash,
} from "lucide-react";

type AuthStep = "idle" | "entering_phone" | "waiting_code" | "waiting_2fa" | "connected";

export default function Settings() {
  const { data: settings, isLoading, refetch } = useGetSettings();
  const updateMutation = useUpdateSettings();
  const connectMutation = useTelegramAccountConnect();
  const verifyMutation = useTelegramAccountVerify();
  const verify2faMutation = useTelegramAccountVerify2fa();
  const disconnectMutation = useTelegramAccountDisconnect();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [authStep, setAuthStep] = useState<AuthStep>("idle");
  const [phone, setPhone] = useState("+998");
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [code, setCode] = useState("");
  const [twoFaPass, setTwoFaPass] = useState("");

  const [operatorName, setOperatorName] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (settings) {
      setOperatorName(settings.operatorName ?? "");
      setCompanyName(settings.companyName ?? "");
      if (settings.telegramAccountConnected) {
        setAuthStep("connected");
      }
    }
  }, [settings]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    refetch();
  };

  const handleSendCode = () => {
    if (!phone.trim() || !apiId.trim() || !apiHash.trim()) {
      toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    connectMutation.mutate(
      { data: { phone: phone.trim(), apiId: parseInt(apiId), apiHash: apiHash.trim() } },
      {
        onSuccess: (res) => {
          if (res.status === "code_sent") {
            setAuthStep("waiting_code");
            toast({ title: "Kod yuborildi", description: `${phone} raqamiga Telegram kodi yuborildi` });
          } else {
            toast({ title: "Xatolik", description: res.error ?? "Ulanib bo'lmadi", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Xatolik", description: "Server xatosi", variant: "destructive" }),
      }
    );
  };

  const handleVerifyCode = () => {
    if (!code.trim()) {
      toast({ title: "Xatolik", description: "Kod kiritilmagan", variant: "destructive" });
      return;
    }
    verifyMutation.mutate(
      { data: { code: code.trim() } },
      {
        onSuccess: (res) => {
          if (res.status === "connected") {
            setAuthStep("connected");
            invalidate();
            toast({ title: "Ulandi!", description: `Telegram akkaunt muvaffaqiyatli ulandi` });
          } else if (res.status === "need_password") {
            setAuthStep("waiting_2fa");
            toast({ title: "2FA kerak", description: "Telegram 2FA parolingizni kiriting" });
          } else {
            toast({ title: "Xatolik", description: res.error ?? "Kod noto'g'ri", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  const handleVerify2FA = () => {
    if (!twoFaPass.trim()) {
      toast({ title: "Xatolik", description: "Parol kiritilmagan", variant: "destructive" });
      return;
    }
    verify2faMutation.mutate(
      { data: { password: twoFaPass } },
      {
        onSuccess: (res) => {
          if (res.status === "connected") {
            setAuthStep("connected");
            invalidate();
            toast({ title: "Ulandi!", description: "Telegram akkaunt muvaffaqiyatli ulandi" });
          } else {
            toast({ title: "Xatolik", description: res.error ?? "Parol noto'g'ri", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
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
          setApiId("");
          setApiHash("");
          setCode("");
          setTwoFaPass("");
          invalidate();
          toast({ title: "Uzildi", description: "Telegram akkaunt o'chirildi" });
        },
      }
    );
  };

  const handleSaveGeneral = () => {
    updateMutation.mutate(
      { data: { operatorName: operatorName || null, companyName: companyName || null } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Saqlandi", description: "Sozlamalar yangilandi" });
        },
        onError: () => toast({ title: "Xatolik", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Yuklanmoqda...</div>;
  }

  const isConnected = settings?.telegramAccountConnected || authStep === "connected";

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-primary" />
          Sozlamalar
        </h1>
        <p className="text-muted-foreground mt-1">Telegram akkaunt va umumiy tizim sozlamalari.</p>
      </div>

      {/* Telegram Account */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-5 w-5 text-[#229ED9]" />
            Telegram Akkaunt Integratsiyasi
            {isConnected ? (
              <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Ulangan
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-auto text-muted-foreground">
                <XCircle className="h-3 w-3 mr-1" /> Ulanmagan
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* CONNECTED STATE */}
          {isConnected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-[#229ED9] flex items-center justify-center shrink-0">
                  <Send className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">Telegram akkaunt ulangan</p>
                  {settings?.telegramAccountPhone && (
                    <p className="text-xs text-green-600 font-mono">{settings.telegramAccountPhone}</p>
                  )}
                  <p className="text-xs text-green-600 mt-0.5">
                    Telegram xabarlari AI agent orqali avtomatik javob beriladi
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 shrink-0 gap-1.5"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Uzish
                </Button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Akkauntingizga kelgan shaxsiy xabarlar AI agent tomonidan avtomatik javob beriladi.
                  Suhbatlar panelida "Operator rejimi" ni yoqib, o'zingiz ham javob berishingiz mumkin.
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: PHONE + API CREDENTIALS */}
          {!isConnected && authStep === "idle" && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <Info className="h-4 w-4" /> Boshlashdan oldin
                </p>
                <p>
                  Telegram akkountingizni ulash uchun{" "}
                  <a
                    href="https://my.telegram.org/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    my.telegram.org/apps
                  </a>{" "}
                  saytidan <strong>API ID</strong> va <strong>API Hash</strong> oling.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" /> API ID
                  </label>
                  <Input
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value.replace(/\D/g, ""))}
                    placeholder="12345678"
                    type="text"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> API Hash
                  </label>
                  <Input
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    placeholder="a1b2c3d4e5f6..."
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Telefon raqam
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998901234567"
                  type="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Xalqaro format: +998 bilan boshlang
                </p>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleSendCode}
                disabled={connectMutation.isPending || !phone || !apiId || !apiHash}
              >
                {connectMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Ulanilmoqda...</>
                ) : (
                  <><Send className="h-4 w-4" /> Kod yuborish <ArrowRight className="h-4 w-4 ml-auto" /></>
                )}
              </Button>
            </div>
          )}

          {/* STEP 2: ENTER OTP CODE */}
          {!isConnected && authStep === "waiting_code" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-1">
                <div className="text-2xl">📱</div>
                <p className="font-semibold text-sm">{phone} raqamiga kod yuborildi</p>
                <p className="text-xs text-muted-foreground">
                  Telegram ilovasini oching — u yerda 5 xonali kod bor
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tasdiqlash kodi</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="12345"
                  maxLength={6}
                  type="text"
                  inputMode="numeric"
                  className="text-center text-xl tracking-[0.5em] font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAuthStep("idle")}>
                  Orqaga
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleVerifyCode}
                  disabled={verifyMutation.isPending || code.length < 4}
                >
                  {verifyMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Tekshirilmoqda...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Tasdiqlash</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: 2FA PASSWORD */}
          {!isConnected && authStep === "waiting_2fa" && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center space-y-1">
                <div className="text-2xl">🔐</div>
                <p className="font-semibold text-sm">Ikki faktorli autentifikatsiya</p>
                <p className="text-xs text-muted-foreground">
                  Telegram akkauntingizda 2FA yoqilgan. Parolingizni kiriting.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> 2FA Parol
                </label>
                <Input
                  value={twoFaPass}
                  onChange={(e) => setTwoFaPass(e.target.value)}
                  type="password"
                  placeholder="Parolingiz..."
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAuthStep("idle")}>
                  Bekor qilish
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleVerify2FA}
                  disabled={verify2faMutation.isPending || !twoFaPass}
                >
                  {verify2faMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Tekshirilmoqda...</>
                  ) : (
                    <><ShieldCheck className="h-4 w-4" /> Kirish</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      {!isConnected && authStep === "idle" && (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold mb-3">Telegram akkaunt qanday ishlaydi?</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {[
                "my.telegram.org/apps dan API ID va API Hash oling",
                "Telefon raqamingizni kiriting — Telegram kodi yuboriladi",
                "Kodni kiriting — akkaunt ulanadi",
                "Sizga kelgan shaxsiy xabarlar AI agent orqali javob beriladi",
                "Suhbatlar panelida barcha muloqotlar ko'rinadi",
                "Operator rejimida siz ham javob berishingiz mumkin",
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
      )}

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
    </div>
  );
}
