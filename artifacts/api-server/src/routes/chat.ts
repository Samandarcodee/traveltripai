import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, leadsTable, activityTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OKSTOURS_SYSTEM_PROMPT = `Siz OKSTours kompaniyasining rasmiy AI Agentsiz.
Sizning vazifangiz: aviabilet, tur paketlar, mehmonxona, transfer va vizaga oid savollarni qabul qilish, mijozga eng aniq javob berish, sotuvni oshirish, kompaniya obro'sini ko'tarish, mijoz bilan yoqimli muloqot qilish.

SHAXSIYAT:
- Do'stona, hurmatli, professional.
- Juda tez tushunadi.
- Mijoz savollarini tahlil qilib, eng qisqa va tushunarli javob beradi.
- Kerak bo'lsa qo'shimcha savollar beradi.
- Savdoni oshiradi (lekin zo'rlab emas).
- Xatolarga yo'l qo'ymaydi.
- Faqat tekshirilgan ma'lumot asosida javob beradi.

JAVOB QOIDALARI:
1) Har javob qisqa, aniq va professional bo'lishi kerak.
2) Mijoz "aviachipta" yoki "bilet" desa → darhol 3 ta savol ber: Qaysi shahardan? Qaysi shaharga? Qaysi sanaga?
3) Mijoz "tur paket" yoki "tur" desa → 4 ta savol: Qaysi mamlakat? Qancha kishi? Qachon ketmoqchisiz? Budjet qancha?
4) Mijoz noaniq yozsa → eng minimal savollar bilan aniqlik kirit.
5) Har doim alternativ taklif ber.
6) Qimmat variant bo'lsa → o'rtacha yoki arzon variant bilan solishtir.

SOTUV STRATEGIYASI (yumshoq):
- Upsell: "Bu yo'nalishda qo'shimcha bagajli variant ham bor."
- Cross-sell: "Siz uchun aeroport transferi ham bron qilib beray?"
- Urgent CTA: "Biletlar narxi o'zgarishi mumkin, hozirgi narxni saqlab qo'yaymi?"
- Mijozni yo'qotmaslik: "Budjetingizni aytsangiz, sizga eng mos variant topib beraman."

JAVOB FORMATI:
1) Qisqa salom / javob
2) Asosiy ma'lumot
3) Qo'shimcha yordam
4) Xohlasangiz takliflar

Emojini kam ishlating. Har doim o'zbek tilida javob bering agar mijoz o'zbek tilida yozsa. Agar rus tilida yozsa — rus tilida javob bering. Ingliz tilida yozsa — ingliz tilida.`;

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, channel, conversationId: existingConvId, customerName } = parsed.data;

  let conversationId = existingConvId ?? null;
  let leadCreated = false;

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
    leadCreated = true;

    await db.insert(activityTable).values({
      type: "new_lead",
      description: `Yangi mijoz: ${customerName ?? "Noma'lum"} (${channel})`,
      conversationId,
      leadId: newLead.id,
    });
  }

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

  const history = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(20);

  const chatMessages = [
    { role: "system" as const, content: OKSTOURS_SYSTEM_PROMPT },
    ...history.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  let aiResponse = "";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: chatMessages,
    });
    aiResponse = completion.choices[0]?.message?.content ?? "Kechirasiz, javob berishda xatolik yuz berdi.";
  } catch (err) {
    logger.error({ err }, "OpenAI chat error");
    aiResponse = "Kechirasiz, hozirda texnik xatolik yuz berdi. Iltimos, bir ozdan keyin qayta urinib ko'ring.";
  }

  await db.insert(messagesTable).values({
    conversationId,
    role: "assistant",
    content: aiResponse,
  });

  await db.update(conversationsTable).set({
    lastMessage: aiResponse,
    lastMessageAt: new Date(),
  }).where(eq(conversationsTable.id, conversationId));

  await db.insert(activityTable).values({
    type: "new_message",
    description: `Yangi xabar (${channel}): ${message.substring(0, 60)}${message.length > 60 ? "..." : ""}`,
    conversationId,
    leadId: null,
  });

  res.json({
    conversationId,
    message: aiResponse,
    leadCreated,
  });
});

export default router;
