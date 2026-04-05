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
  positive: { label: "Позитивный", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
  neutral: { label: "Нейтральный", color: "text-amber-600", bg: "bg-amber-50", icon: AlertCircle },
  negative: { label: "Негативный", color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
};

const segmentConfig = {
  hot: { label: "Горячий лид", variant: "destructive" as const },
  warm: { label: "Тёплый лид", variant: "secondary" as const },
  cold: { label: "Холодный лид", variant: "outline" as const },
};

const EXAMPLE_TRANSCRIPT = `Оператор: Здравствуйте! OKSTours, чем могу помочь?

Клиент: Да, привет. Сколько стоит билет в Дубай?

Оператор: В какую дату планируете лететь?

Клиент: Не знаю, в мае, наверное.

Оператор: На двоих примерно $800.

Клиент: Ой, это дороговато. Я думал $500.

Оператор: Да, цены выросли. Что-нибудь ещё?

Клиент: Нет, спасибо.`;

export default function CallAnalysis() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const analyzeMutation = useAnalyzeCall();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setResult(null);
    analyzeMutation.mutate(
      { data: { transcript, language: "ru" } },
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
          Анализ звонков
        </h1>
        <p className="text-muted-foreground">
          Вставьте транскрипт звонка — AI проанализирует кто что говорил, где была упущена продажа и что нужно улучшить.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Транскрипт звонка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAnalyze} className="space-y-4">
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={`Вставьте транскрипт звонка сюда...\n\nОператор: ...\nКлиент: ...`}
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
                    Вставить пример
                  </Button>
                  <Button
                    type="submit"
                    disabled={!transcript.trim() || analyzeMutation.isPending}
                    className="flex-1 gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    {analyzeMutation.isPending ? "Анализируется..." : "Анализировать через AI"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 px-5 space-y-2">
              <p className="text-sm font-medium text-primary">Что анализирует AI?</p>
              {[
                "Что хочет клиент",
                "Ошибки оператора",
                "Где была упущена продажа",
                "Как нужно было ответить на возражения",
                "Сегмент лида (горячий/тёплый/холодный)",
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
                <p className="text-sm text-muted-foreground">AI анализирует звонок...</p>
              </CardContent>
            </Card>
          )}

          {result && !analyzeMutation.isPending && (
            <>
              <div className="flex gap-3">
                <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg ${sentimentInfo?.bg}`}>
                  <SentimentIcon className={`h-4 w-4 ${sentimentInfo?.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Настроение</p>
                    <p className={`text-sm font-semibold ${sentimentInfo?.color}`}>{sentimentInfo?.label}</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Качество лида</p>
                    <Badge variant={segmentConfig[result.leadQuality].variant} className="mt-0.5">
                      {segmentConfig[result.leadQuality].label}
                    </Badge>
                  </div>
                </div>
              </div>

              {[
                { icon: Brain, title: "Общий вывод", content: result.summary, color: "text-primary" },
                { icon: User, title: "Что хочет клиент", content: result.clientRequest, color: "text-blue-600" },
                { icon: AlertCircle, title: "Возражения", content: result.objections, color: "text-amber-600" },
                { icon: TrendingUp, title: "Упущенные продажи", content: result.missedOpportunities, color: "text-red-600" },
                { icon: Lightbulb, title: "Рекомендации", content: result.recommendations, color: "text-green-600" },
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
                <p className="text-muted-foreground text-sm">Результаты анализа появятся здесь</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
