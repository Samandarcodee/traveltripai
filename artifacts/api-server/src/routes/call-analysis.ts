import { Router, type IRouter } from "express";
import { AnalyzeCallBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/call-analysis", async (req, res): Promise<void> => {
  const parsed = AnalyzeCallBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { transcript, language } = parsed.data;
  const lang = language ?? "uz";
  const langLabel = lang === "uz" ? "o'zbek" : lang === "ru" ? "rus" : "ingliz";

  const systemPrompt = `Siz OKSTours kompaniyasining professional savdo tahlilchisisiz. Sizga qo'ng'iroq yozuvi (transcript) beriladi. Uni tahlil qilib, quyidagi formatda JSON javob bering:
{
  "summary": "Qo'ng'iroqning qisqa xulosasi",
  "clientRequest": "Mijoz nima xohlaydi",
  "objections": "Mijozning e'tirozlari yoki ikkilanishlari",
  "missedOpportunities": "Qaysi joyda sotuv boy berildi",
  "recommendations": "Keyingi qadamlar va tavsiyalar",
  "sentiment": "positive | neutral | negative",
  "leadQuality": "hot | warm | cold"
}
Faqat JSON qaytaring, boshqa matn yo'q.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Qo'ng'iroq yozuvi (${langLabel} tilida):\n\n${transcript}`,
      },
    ],
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";

  let analysis: {
    summary?: string;
    clientRequest?: string;
    objections?: string;
    missedOpportunities?: string;
    recommendations?: string;
    sentiment?: string;
    leadQuality?: string;
  } = {};

  try {
    analysis = JSON.parse(content);
  } catch {
    analysis = { summary: content };
  }

  res.json({
    summary: analysis.summary ?? "Tahlil qilinmadi",
    clientRequest: analysis.clientRequest ?? "Aniqlanmadi",
    objections: analysis.objections ?? "Yo'q",
    missedOpportunities: analysis.missedOpportunities ?? "Aniqlanmadi",
    recommendations: analysis.recommendations ?? "Keyingi suhbatda aniqlashtiring",
    sentiment: (["positive", "neutral", "negative"].includes(analysis.sentiment ?? "") ? analysis.sentiment : "neutral") as "positive" | "neutral" | "negative",
    leadQuality: (["hot", "warm", "cold"].includes(analysis.leadQuality ?? "") ? analysis.leadQuality : "cold") as "hot" | "warm" | "cold",
  });
});

export default router;
