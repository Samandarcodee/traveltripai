import { Router, type IRouter } from "express";
import { AnalyzeCallBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { CallAnalysisResponse } from "../lib/validation.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.post("/call-analysis", async (req, res): Promise<void> => {
  const parsed = AnalyzeCallBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.message },
    });
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

  try {
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

    let analysis: Record<string, unknown> = {};

    try {
      analysis = JSON.parse(content);
    } catch (parseErr) {
      logger.warn(
        { error: parseErr instanceof Error ? parseErr.message : String(parseErr) },
        "Failed to parse call analysis JSON",
      );
      analysis = { summary: content };
    }

    // Validate with Zod schema
    const validated = CallAnalysisResponse.safeParse(analysis);
    const result = validated.success ? validated.data : analysis;

    res.json({
      success: true,
      data: {
        summary: result.summary ?? "Tahlil qilinmadi",
        clientRequest: result.clientRequest ?? "Aniqlanmadi",
        objections: result.objections ?? "Yo'q",
        missedOpportunities: result.missedOpportunities ?? "Aniqlanmadi",
        recommendations: result.recommendations ?? "Keyingi suhbatda aniqlashtiring",
        sentiment: (
          ["positive", "neutral", "negative"].includes(result.sentiment ?? "")
            ? result.sentiment
            : "neutral"
        ) as "positive" | "neutral" | "negative",
        leadQuality: (
          ["hot", "warm", "cold"].includes(result.leadQuality ?? "")
            ? result.leadQuality
            : "cold"
        ) as "hot" | "warm" | "cold",
      },
    });
  } catch (err) {
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      "Call analysis failed",
    );
    res.status(500).json({
      success: false,
      error: {
        code: "ANALYSIS_FAILED",
        message: "Failed to analyze call recording",
      },
    });
  }
});

export default router;
