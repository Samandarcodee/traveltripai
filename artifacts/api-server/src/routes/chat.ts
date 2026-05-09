import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, leadsTable, activityTable, promotionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger.js";
import { AiLeadExtraction } from "../lib/validation.js";

const router: IRouter = Router();

// ─── SALES MANAGER SYSTEM PROMPT ────────────────────────────────────────────
const SALES_MANAGER_PROMPT = `Siz OKSTours kompaniyasining professional SOTUV MENEJERI AI agentsiz. Sizning asosiy vazifangiz — har bir mijozni BRON QILISHGACHA olib borish.

=== SHAXSIYAT ===
Ismingiz: Aziz (OKSTours menejeri)
Uslub: Do'stona, ishonchli, professional, savdo yo'naltirilgan
Til: Mijoz qaysi tilda yozsa — o'sha tilda javob bering (O'zbek/Rus/Ingliz)

=== SOTUV FUNNEL (har xabardan keyin qaysi bosqichdasiz aniqlang) ===
1. DISCOVERY  — mijoz nima xohlayotganini tushunish
2. QUALIFICATION — yo'nalish, sana, kishilar soni, budjet aniqlashtirish
3. PROPOSAL — eng mos variant taklif qilish va narx aytish
4. CLOSING — bron qilishga undash, urgentlik yaratish
5. CONFIRMATION — bron jarayonini boshlash, aloqa ma'lumotlari olish

=== MULOQOT QOIDALARI ===

DISCOVERY bosqichi:
- "Salom! OKSTours — men Aziz. Sizga qanday yordam bera olaman?"
- Mijoz yo'nalish aytsa → darhol QUALIFICATION bosqichiga o'ting

QUALIFICATION (MAJBURIY savollar — birin-ketin bering, birdaniga emas):
1. Qaysi yo'nalish? (agar aytmagan bo'lsa)
2. Qachon ketmoqchisiz? (taxminiy sana)
3. Necha kishi? (kattalar / bolalar)
4. Budjet qancha? (taxminiy, dollar yoki so'mda)
→ FAQAT shu 4 ta ma'lumot to'liq bo'lganda narx aytib PROPOSAL ga o'ting

PROPOSAL:
- Aniq narx ayt (taxminiy bo'lsa ham)
- 2-3 ta variant taklif qil (economy/comfort/business)
- Upsell qil: bagaj, transfer, sug'urta
- "Hozirgi narx — keyinroq o'zgarishi mumkin" de

CLOSING (bu eng muhim bosqich):
- Urgentlik: "Bu narx faqat bugunga valid, ertaga oshishi mumkin"
- Social proof: "Bugun 3 ta mijoz shu yo'nalishni bron qildi"
- Easy first step: "Bron qilish uchun faqat ismingiz va telefon raqamingiz kerak"
- Objection handling (quyida)

E'TIROZ ISHLASH TEXNIKASI:
- "Qimmat" → "Oyiga bo'lib to'lash imkoniyati bor. Yoki [arzonroq sana/variant] ko'ray?"
- "O'ylab ko'raman" → "Bilaman, bu muhim qaror. Nimasi haqida ko'proq ma'lumot kerak?"
- "Vaqtim yo'q" → "3 daqiqada bron qilib qo'yaman, keyin rahat o'ylab ko'rar ekanmiz"
- "Boshqa joydan arzon" → "Qayerda ko'rdingiz? Narx tenglashtiramiz yoki bonuslar qo'shamiz"

ALOQA MA'LUMOTLARI OLISH:
Mijoz qiziqayotgan bo'lsa → "Aniq narx va mavjudlikni tekshirib berish uchun telefon raqamingizni yozsangiz?"
Telegram bo'lsa → "Telegram orqali gaplashyapmiz, bron tayyorlagach sizga yozaman"

OPERATOR GA YUBORISH:
Agar mijoz: murakkab so'rov / shikoyat / maxsus talab bildirsachiqsa yozing: [OPERATOR_KERAK]

=== JAVOB FORMATI ===
- Qisqa va aniq (2-4 gap)
- Har xabar oxirida bitta aniq savol YOKI aniq taklif
- Emojidan kam foydalaning (1-2 ta maksimum)
- Ro'yxat emas, oddiy muloqot tili

=== TAQIQLANGAN ===
- "Kechirasiz" (juda ko'p uzr so'ramang)
- Javobsiz qoldirish
- Narxni aniqlamasdan aytish
- "Bilmayman" deyish — har doim alternativ ayting`;

async function buildSystemPrompt(companyName?: string | null, operatorName?: string | null): Promise<string> {
  const activePromos = await db.select().from(promotionsTable).where(eq(promotionsTable.active, 1)).limit(10);

  let prompt = SALES_MANAGER_PROMPT;

  if (companyName || operatorName) {
    prompt = prompt.replace("OKSTours", companyName ?? "OKSTours");
  }

  if (activePromos.length > 0) {
    const promoText = activePromos.map((p) =>
      `• ${p.title}: ${p.description}${p.discount ? ` (Chegirma: ${p.discount})` : ""}${p.destination ? ` [${p.destination}]` : ""}${p.validUntil ? ` — ${p.validUntil} gacha` : ""}`
    ).join("\n");

    prompt += `\n\n=== FAOL AKSIYALAR (mijoz yo'nalish so'raganda yumshoq ayt) ===\n${promoText}`;
  }

  return prompt;
}

// ─── LEAD EXTRACTOR (background, non-blocking) ──────────────────────────────
async function extractAndUpdateLead(
  conversationId: number,
  messages: { role: string; content: string }[]
): Promise<void> {
  try {
    const conversationText = messages
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Mijoz" : "Agent"}: ${m.content}`)
      .join("\n");

    const extractionPrompt = `Suhbatdan quyidagi ma'lumotlarni JSON formatda chiqaring. Agar topilmasa — null qo'ying.

Suhbat:
${conversationText}

Faqat JSON qaytaring, boshqa hech narsa yozmang:
{
  "destination": "yo'nalish (shahar/mamlakat) yoki null",
  "budget": "budjet (raqam va valyuta) yoki null",
  "departureDate": "jo'nash sanasi yoki null",
  "passengersCount": "kishilar soni (faqat raqam) yoki null",
  "interest": "qiziqish turi (aviabilet/tur/mehmonxona/viza) yoki null",
  "phone": "telefon raqami yoki null",
  "name": "ism yoki null",
  "segment": "hot/warm/cold (suhbat intensivligiga qarab) yoki null",
  "status": "new/contacted/qualified (ma'lumot to'liqligiga qarab) yoki null",
  "needsOperator": false
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: extractionPrompt }],
      max_tokens: 300,
      temperature: 0.1,
    });

    const rawJson = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    let extracted: any;
    try {
      extracted = JSON.parse(jsonMatch[0]);
      // Validate with Zod schema to ensure data integrity
      const validated = AiLeadExtraction.safeParse(extracted);
      if (!validated.success) {
        logger.warn({ errors: validated.error.errors }, "AI extraction validation failed");
        extracted = validated.data || extracted;
      } else {
        extracted = validated.data;
      }
    } catch (parseErr) {
      logger.error(
        { error: parseErr instanceof Error ? parseErr.message : String(parseErr), json: jsonMatch[0] },
        "Failed to parse AI extraction JSON",
      );
      return;
    }

    // Find lead for this conversation
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
    if (!conv?.leadId) return;

    const updateFields: Record<string, any> = {};
    if (extracted.destination) updateFields.destination = extracted.destination;
    if (extracted.budget) updateFields.budget = extracted.budget;
    if (extracted.departureDate) updateFields.departureDate = extracted.departureDate;
    if (extracted.passengersCount) updateFields.passengersCount = String(extracted.passengersCount);
    if (extracted.interest) updateFields.interest = extracted.interest;
    if (extracted.phone) updateFields.phone = extracted.phone;
    if (extracted.name && extracted.name !== "null") updateFields.name = extracted.name;
    if (extracted.segment && ["hot", "warm", "cold"].includes(extracted.segment)) {
      updateFields.segment = extracted.segment;
    }
    if (extracted.status && ["new", "contacted", "qualified", "booked", "lost"].includes(extracted.status)) {
      updateFields.status = extracted.status;
    }

    if (Object.keys(updateFields).length > 0) {
      await db.update(leadsTable).set(updateFields).where(eq(leadsTable.id, conv.leadId));
    }

    // Update customer name in conversation if extracted
    if (extracted.name && extracted.name !== "null" && !conv.customerName) {
      await db.update(conversationsTable)
        .set({ customerName: extracted.name })
        .where(eq(conversationsTable.id, conversationId));
    }

    // If needsOperator flag set — switch conversation to operator mode
    if (extracted.needsOperator) {
      await db.update(conversationsTable)
        .set({ operatorMode: 1 })
        .where(eq(conversationsTable.id, conversationId));

      await db.insert(activityTable).values({
        type: "follow_up",
        description: `AI агент запросил помощь оператора`,
        conversationId,
        leadId: conv.leadId ?? undefined,
      });
    }
  } catch (err) {
    logger.warn({ err }, "Lead extraction failed (non-critical)");
  }
}

// ─── MAIN CHAT ENDPOINT ──────────────────────────────────────────────────────
router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, channel, conversationId: existingConvId, customerName } = parsed.data;

  let conversationId = existingConvId ?? null;
  let leadCreated = false;
  let leadId: number | null = null;

  // ── Create conversation + lead if new ──
  if (!conversationId) {
    const [newConv] = await db.insert(conversationsTable).values({
      channel,
      status: "active",
      customerName: customerName ?? null,
      lastMessage: message,
      lastMessageAt: new Date(),
    }).returning();
    conversationId = newConv.id;

    const [newLead] = await db.insert(leadsTable).values({
      name: customerName ?? null,
      segment: "cold",
      status: "new",
      conversationId,
    }).returning();
    leadId = newLead.id;
    leadCreated = true;

    // Link conversation → lead
    await db.update(conversationsTable)
      .set({ leadId: newLead.id })
      .where(eq(conversationsTable.id, conversationId));

    await db.insert(activityTable).values({
      type: "new_lead",
      description: `Новый клиент: ${customerName ?? "Неизвестный"} (${channel})`,
      conversationId,
      leadId: newLead.id,
    });
  } else {
    // Get leadId from existing conversation
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
    leadId = conv?.leadId ?? null;
  }

  // ── Save user message ──
  await db.insert(messagesTable).values({
    conversationId,
    role: "user",
    content: message,
  });

  await db.update(conversationsTable).set({
    lastMessage: message,
    lastMessageAt: new Date(),
    status: "active",
  }).where(eq(conversationsTable.id, conversationId));

  // ── Fetch conversation history ──
  const history = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(30);

  const systemPrompt = await buildSystemPrompt();

  // Build chat messages — include operator messages as assistant context
  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.reverse()
      .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "operator")
      .map((m) => ({
        role: (m.role === "operator" ? "assistant" : m.role) as "user" | "assistant",
        content: m.role === "operator" ? `[Operator]: ${m.content}` : m.content,
      })),
  ];

  // ── Call AI ──
  let aiResponse = "";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      temperature: 0.7,
      messages: chatMessages,
    });
    aiResponse = completion.choices[0]?.message?.content ?? "Texnik xatolik yuz berdi. Biroz kutib, qayta yozing.";
  } catch (err) {
    logger.error({ err }, "OpenAI chat error");
    aiResponse = "Texnik xatolik yuz berdi. Biroz kutib, qayta yozing.";
  }

  // Clean operator escalation flag from response if present
  const needsOperator = aiResponse.includes("[OPERATOR_KERAK]");
  const cleanResponse = aiResponse.replace("[OPERATOR_KERAK]", "").trim();

  // ── Save AI response ──
  await db.insert(messagesTable).values({
    conversationId,
    role: "assistant",
    content: cleanResponse,
  });

  await db.update(conversationsTable).set({
    lastMessage: cleanResponse,
    lastMessageAt: new Date(),
    ...(needsOperator ? { operatorMode: 0 } : {}),
  }).where(eq(conversationsTable.id, conversationId));

  await db.insert(activityTable).values({
    type: "new_message",
    description: `Новое сообщение (${channel}): "${message.substring(0, 60)}${message.length > 60 ? "..." : ""}"`,
    conversationId,
    leadId: leadId ?? undefined,
  });

  // ── Handle operator escalation ──
  if (needsOperator) {
    await db.update(conversationsTable)
      .set({ operatorMode: 0 })
      .where(eq(conversationsTable.id, conversationId));

    if (leadId) {
      await db.insert(activityTable).values({
        type: "follow_up",
        description: `AI агент запросил помощь оператора`,
        conversationId,
        leadId,
      });
    }
  }

  // ── Background: extract lead data from conversation ──
  const allMessages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  // Fire and forget — don't block the response
  extractAndUpdateLead(conversationId, allMessages).catch((e) =>
    logger.warn({ e }, "extractAndUpdateLead error")
  );

  res.json({
    conversationId,
    message: cleanResponse,
    leadCreated,
    needsOperator,
  });
});

export default router;
