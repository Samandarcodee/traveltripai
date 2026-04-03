import React, { useState } from "react";
import { useAnalyzeCall } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  PhoneCall,
  Mic,
  Brain,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  User,
  Lightbulb,
} from "lucide-react";

type AnalysisResult = {
  summary: string;
  clientRequest: string;
  objections: string;
  missedOpportunities: string;
  recommendations: string;
  sentiment: "positive" | "neutral" | "negative";
  leadQuality: "hot" | "warm" | "cold";
};

const sentimentConfig = {
  positive: { label: "Ijobiy", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
  neutral: { label: "Neytral", color: "text-amber-600", bg: "bg-amber-50", icon: AlertCircle },
  negative: { label: "Salbiy", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
};

const segmentConfig = {
  hot: { label: "Issiq Lid", variant: "destructive" as const },
  warm: { label: "Iliq Lid", variant: "secondary" as const },
  cold: { label: "Sovuq Lid", variant: "outline" as const },
};

const EXAMPLE_TRANSCRIPT = `Operator: Assalomu alaykum! OKSTours, qanday yordam bera olay?

Mijoz: Ha, salom. Dubai'ga chipta qancha turadi?

Operator: Dubai'ga qaysi sanada ketmoqchisiz?

Mijoz: Bilmadim, may oyida ehtimol.

Operator: Ikki kishiga $800 atrofida.

Mijoz: Voy, bu juda qimmat ekan. Men $500 deb o'ylagandim.

Operator: Ha, narxlar oshgan. Yana nima bo'ladi?

Mijoz: Yo'q, rahmat.`;

export default function CallAnalysis() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const analyzeMutation = useAnalyzeCall();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setResult(null);
    analyzeMutation.mutate(
      { data: { transcript, language: "uz" } },
      {
        onSuccess: (data) => {
          setResult(data as AnalysisResult);
        },
      }
    );
  };

  const sentimentInfo = result ? sentimentConfig[result.sentiment] : null;
  const SentimentIcon = sentimentInfo?.icon ?? CheckCircle;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <PhoneCall className="h-7 w-7 text-primary" />
          Qo'ng'iroq Tahlili
        </h1>
        <p className="text-muted-foreground">
          Qo'ng'iroq matnini (transcript) joylashtiring — AI kim nima dedi, qayerda sotuv boy berildi va nima qilish kerakligini tahlil qiladi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Qo'ng'iroq Matni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAnalyze} className="space-y-4">
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Qo'ng'iroq transkripsiyasini shu yerga joylashtiring...

Operator: ...
Mijoz: ..."
                  className="min-h-[280px] font-mono text-sm resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTranscript(EXAMPLE_TRANSCRIPT)}
                    className="flex-1"
                  >
                    Namuna kiriting
                  </Button>
                  <Button
                    type="submit"
                    disabled={!transcript.trim() || analyzeMutation.isPending}
                    className="flex-1 gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    {analyzeMutation.isPending ? "Tahlil qilinmoqda..." : "AI Tahlil Qilsin"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 px-5 space-y-2">
              <p className="text-sm font-medium text-primary">AI nima tahlil qiladi?</p>
              {[
                "Mijoz nima xohlayotgani",
                "Operatorning xatoliklari",
                "Qaysi joyda sotuv boy berildi",
                "E'tirozlarga qanday javob berish kerak edi",
                "Lid segmenti (issiq/iliq/sovuq)",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {analyzeMutation.isPending && (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">AI qo'ng'iroqni tahlil qilyapti...</p>
              </CardContent>
            </Card>
          )}

          {result && !analyzeMutation.isPending && (
            <>
              <div className="flex gap-3">
                <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg ${sentimentInfo?.bg}`}>
                  <SentimentIcon className={`h-4 w-4 ${sentimentInfo?.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Kayfiyat</p>
                    <p className={`text-sm font-semibold ${sentimentInfo?.color}`}>{sentimentInfo?.label}</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lid sifati</p>
                    <Badge variant={segmentConfig[result.leadQuality].variant} className="mt-0.5">
                      {segmentConfig[result.leadQuality].label}
                    </Badge>
                  </div>
                </div>
              </div>

              {[
                { icon: Brain, title: "Umumiy xulosa", content: result.summary, color: "text-primary" },
                { icon: User, title: "Mijoz xohlaydi", content: result.clientRequest, color: "text-blue-600" },
                { icon: AlertCircle, title: "E'tirozlar", content: result.objections, color: "text-amber-600" },
                { icon: TrendingUp, title: "Sotuv boy berildi", content: result.missedOpportunities, color: "text-red-600" },
                { icon: Lightbulb, title: "Tavsiyalar", content: result.recommendations, color: "text-green-600" },
              ].map(({ icon: Icon, title, content, color }) => (
                <Card key={title} className="shadow-sm">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className={`text-sm flex items-center gap-2 ${color}`}>
                      <Icon className="h-4 w-4" />
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <p className="text-sm text-foreground leading-relaxed">{content}</p>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {!result && !analyzeMutation.isPending && (
            <Card className="shadow-sm border-dashed">
              <CardContent className="py-16 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground text-sm">Tahlil natijalari shu yerda ko'rinadi</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
