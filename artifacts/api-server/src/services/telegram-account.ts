import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import type { NewMessageEvent } from "telegram/events/NewMessage.js";
import { Api } from "telegram/tl/index.js";
import { db, conversationsTable, messagesTable, leadsTable, activityTable, promotionsTable, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import pino from "pino";

const logger = pino({ name: "telegram-account" });

interface PendingAuth {
  client: TelegramClient;
  phone: string;
  phoneCodeHash: string;
  apiId: number;
  apiHash: string;
}

let pendingAuth: PendingAuth | null = null;
let activeClient: TelegramClient | null = null;

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string | null): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

const BASE_SYSTEM_PROMPT = `Siz OKSTours kompaniyasining rasmiy AI Agentsiz.
Sizning vazifangiz: aviabilet, tur paketlar, mehmonxona, transfer va vizaga oid savollarni qabul qilish, mijozga eng aniq javob berish, sotuvni oshirish.
Har doim qisqa, aniq va professional javob bering. O'zbek, rus yoki ingliz tilida javob bering (mijoz qaysi tilda yozsa).`;

async function buildSystemPrompt(): Promise<string> {
  const activePromos = await db.select().from(promotionsTable).where(eq(promotionsTable.active, 1)).limit(10);
  if (activePromos.length === 0) return BASE_SYSTEM_PROMPT;
  const promoText = activePromos.map((p) =>
    `- ${p.title}: ${p.description}${p.discount ? ` (${p.discount})` : ""}${p.destination ? ` [${p.destination}]` : ""}${p.validUntil ? ` — ${p.validUntil} gacha` : ""}`
  ).join("\n");
  return `${BASE_SYSTEM_PROMPT}\n\nFAOL AKSIYALAR:\n${promoText}`;
}

async function handleIncomingMessage(event: NewMessageEvent): Promise<void> {
  if (!activeClient) return;

  try {
    const message = event.message;
    const text = message.text;
    if (!text || !message.isPrivate) return;

    const sender = await message.getSender() as Api.User | null;
    if (!sender || sender.bot) return;

    const senderId = String(sender.id);
    const firstName = sender.firstName ?? "";
    const lastName = sender.lastName ?? "";
    const username = sender.username ?? "";
    const customerName = [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram User ${senderId}`;

    let [conversation] = await db.select().from(conversationsTable).where(
      and(eq(conversationsTable.channel, "telegram"), eq(conversationsTable.externalId, senderId))
    );

    if (!conversation) {
      const [lead] = await db.insert(leadsTable).values({
        name: customerName,
        segment: "cold",
        status: "new",
        leadSource: "telegram",
      }).returning();

      const [newConv] = await db.insert(conversationsTable).values({
        channel: "telegram",
        status: "active",
        customerName,
        externalId: senderId,
        leadId: lead.id,
      }).returning();
      conversation = newConv;

      await db.update(leadsTable)
        .set({ conversationId: newConv.id })
        .where(eq(leadsTable.id, lead.id));

      await db.insert(activityTable).values({
        type: "new_lead",
        description: `Telegram yangi mijoz: ${customerName}`,
        conversationId: newConv.id,
        leadId: lead.id,
      });
    }

    if (conversation.operatorMode === 1) {
      await db.insert(messagesTable).values({
        conversationId: conversation.id,
        role: "user",
        content: text,
      });
      await db.update(conversationsTable)
        .set({ lastMessage: text, lastMessageAt: new Date() })
        .where(eq(conversationsTable.id, conversation.id));
      return;
    }

    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      role: "user",
      content: text,
    });

    const history = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversation.id))
      .orderBy(messagesTable.createdAt);

    const systemPrompt = await buildSystemPrompt();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-20).map((m) => ({
          role: m.role === "operator" ? "assistant" : (m.role as "user" | "assistant"),
          content: m.content,
        })),
      ],
      max_tokens: 500,
    });

    const aiReply = completion.choices[0]?.message?.content ?? "Kechirasiz, hozir javob bera olmayapman.";

    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      role: "assistant",
      content: aiReply,
    });

    await db.update(conversationsTable)
      .set({ lastMessage: aiReply, lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, conversation.id));

    await db.insert(activityTable).values({
      type: "new_message",
      description: `Telegram xabar: ${customerName} — "${text.slice(0, 60)}"`,
      conversationId: conversation.id,
      leadId: conversation.leadId ?? undefined,
    });

    await activeClient.sendMessage(sender, { message: aiReply });
  } catch (err) {
    logger.error({ err }, "Error handling incoming Telegram message");
  }
}

export async function sendMessageToUser(externalId: string, text: string): Promise<boolean> {
  if (!activeClient) return false;
  try {
    await activeClient.sendMessage(Number(externalId), { message: text });
    return true;
  } catch (err: any) {
    logger.error({ err, externalId }, "Failed to send Telegram message to user");
    // Try alternative approach
    try {
      const entity = await activeClient.getEntity(externalId);
      await activeClient.sendMessage(entity, { message: text });
      return true;
    } catch (err2) {
      logger.error({ err: err2 }, "sendMessageToUser fallback also failed");
      return false;
    }
  }
}

function attachMessageHandler(client: TelegramClient): void {
  client.addEventHandler(handleIncomingMessage, new NewMessage({ incoming: true }));
  logger.info("Telegram message handler attached");
}

export async function initFromSession(): Promise<void> {
  try {
    const sessionStr = await getSetting("telegram_session");
    const apiIdStr = await getSetting("telegram_api_id");
    const apiHashStr = await getSetting("telegram_api_hash");

    if (!sessionStr || !apiIdStr || !apiHashStr) return;

    const apiId = parseInt(apiIdStr, 10);
    const apiHash = apiHashStr;
    const session = new StringSession(sessionStr);

    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: false,
    });

    await client.connect();

    if (!await client.isUserAuthorized()) {
      logger.warn("Telegram session expired, clearing");
      await setSetting("telegram_session", null);
      await setSetting("telegram_account_connected", null);
      await setSetting("telegram_phone", null);
      return;
    }

    activeClient = client;
    attachMessageHandler(client);
    logger.info("Telegram account restored from session");
  } catch (err) {
    logger.error({ err }, "Failed to init Telegram from session");
  }
}

export async function startAuth(phone: string, apiId: number, apiHash: string): Promise<{ status: "code_sent" | "error"; error?: string }> {
  try {
    if (pendingAuth) {
      try { await pendingAuth.client.disconnect(); } catch {}
      pendingAuth = null;
    }

    const session = new StringSession("");
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: false,
    });

    await client.connect();

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phone,
        apiId,
        apiHash,
        settings: new Api.CodeSettings({}),
      })
    ) as Api.auth.SentCode;

    pendingAuth = {
      client,
      phone,
      phoneCodeHash: result.phoneCodeHash,
      apiId,
      apiHash,
    };

    await setSetting("telegram_api_id", String(apiId));
    await setSetting("telegram_api_hash", apiHash);
    await setSetting("telegram_phone", phone);

    return { status: "code_sent" };
  } catch (err: any) {
    logger.error({ err }, "startAuth error");
    return { status: "error", error: err?.message ?? "Ulanib bo'lmadi" };
  }
}

export async function verifyCode(code: string): Promise<{ status: "connected" | "need_password" | "error"; phone?: string; error?: string }> {
  if (!pendingAuth) {
    return { status: "error", error: "Avval telefon raqam kiriting" };
  }

  try {
    const { client, phone, phoneCodeHash } = pendingAuth;

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash,
          phoneCode: code,
        })
      );
    } catch (err: any) {
      if (err?.message?.includes("SESSION_PASSWORD_NEEDED") || err?.errorMessage === "SESSION_PASSWORD_NEEDED") {
        return { status: "need_password" };
      }
      throw err;
    }

    const sessionStr = client.session.save() as unknown as string;
    await setSetting("telegram_session", sessionStr);
    await setSetting("telegram_account_connected", "true");

    activeClient = client;
    attachMessageHandler(client);
    pendingAuth = null;

    return { status: "connected", phone };
  } catch (err: any) {
    logger.error({ err }, "verifyCode error");
    pendingAuth = null;
    return { status: "error", error: err?.message ?? "Kod noto'g'ri" };
  }
}

export async function verify2FA(password: string): Promise<{ status: "connected" | "error"; phone?: string; error?: string }> {
  if (!pendingAuth) {
    return { status: "error", error: "Avval telefon raqam kiriting" };
  }

  try {
    const { client, phone, apiId, apiHash } = pendingAuth;

    const passwordInfo = await client.invoke(new Api.account.GetPassword()) as Api.account.Password;

    const { computeCheck } = await import("telegram/Password.js");
    const inputCheckPassword = await computeCheck(passwordInfo, password);

    await client.invoke(new Api.auth.CheckPassword({ password: inputCheckPassword }));

    const sessionStr = client.session.save() as unknown as string;
    await setSetting("telegram_session", sessionStr);
    await setSetting("telegram_account_connected", "true");

    activeClient = client;
    attachMessageHandler(client);
    pendingAuth = null;

    return { status: "connected", phone };
  } catch (err: any) {
    logger.error({ err }, "verify2FA error");
    return { status: "error", error: err?.message ?? "Parol noto'g'ri" };
  }
}

export async function disconnectAccount(): Promise<void> {
  if (activeClient) {
    try { await activeClient.disconnect(); } catch {}
    activeClient = null;
  }
  if (pendingAuth) {
    try { await pendingAuth.client.disconnect(); } catch {}
    pendingAuth = null;
  }
  await setSetting("telegram_session", null);
  await setSetting("telegram_account_connected", null);
}

export function isConnected(): boolean {
  return activeClient !== null;
}

export function getPendingPhone(): string | null {
  return pendingAuth?.phone ?? null;
}
