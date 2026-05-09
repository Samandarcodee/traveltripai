/**
 * Telegram API Client Utilities
 * Centralized service for making requests to Telegram Bot API
 */

import { logger } from "../lib/logger";

export interface SendMessageOptions {
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
}

/**
 * Send a message via Telegram Bot API
 * @param token - Telegram bot API token
 * @param chatId - Chat ID or username to send message to
 * @param text - Message text
 * @param options - Optional parameters for the message
 * @throws Error if the API request fails or returns an error
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  options: SendMessageOptions = {},
): Promise<void> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || "HTML",
        disable_web_page_preview: options.disableWebPagePreview,
        disable_notification: options.disableNotification,
        reply_to_message_id: options.replyToMessageId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(
        { status: response.status, error, token: token.slice(0, 8) },
        "Telegram API error",
      );
      throw new Error(
        `Telegram API error: ${response.status} - ${error}`,
      );
    }

    logger.debug(
      { chatId, token: token.slice(0, 8) },
      "Telegram message sent successfully",
    );
  } catch (err) {
    logger.error(
      {
        chatId,
        token: token.slice(0, 8),
        error: err instanceof Error ? err.message : String(err),
      },
      "Failed to send Telegram message",
    );
    // Re-throw to allow callers to handle failures
    throw err;
  }
}

/**
 * Get file information from Telegram
 * @param token - Telegram bot API token
 * @param fileId - File ID returned by Telegram
 * @returns File info including file_path for downloading
 */
export async function getTelegramFile(
  token: string,
  fileId: string,
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error(
        { status: response.status, error, token: token.slice(0, 8) },
        "Telegram API error (getFile)",
      );
      throw new Error(`Telegram API error: ${response.status}`);
    }

    return response.json();
  } catch (err) {
    logger.error(
      {
        fileId,
        token: token.slice(0, 8),
        error: err instanceof Error ? err.message : String(err),
      },
      "Failed to get Telegram file info",
    );
    throw err;
  }
}

/**
 * Delete a message from Telegram
 * @param token - Telegram bot API token
 * @param chatId - Chat ID
 * @param messageId - Message ID to delete
 */
export async function deleteTelegramMessage(
  token: string,
  chatId: string | number,
  messageId: number,
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/deleteMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error(
        { status: response.status, error, token: token.slice(0, 8) },
        "Telegram API error (deleteMessage)",
      );
      throw new Error(`Telegram API error: ${response.status}`);
    }

    logger.debug({ chatId, messageId }, "Telegram message deleted");
  } catch (err) {
    logger.error(
      {
        chatId,
        messageId,
        error: err instanceof Error ? err.message : String(err),
      },
      "Failed to delete Telegram message",
    );
    throw err;
  }
}

/**
 * Edit a message in Telegram
 * @param token - Telegram bot API token
 * @param chatId - Chat ID
 * @param messageId - Message ID to edit
 * @param text - New message text
 */
export async function editTelegramMessage(
  token: string,
  chatId: string | number,
  messageId: number,
  text: string,
): Promise<void> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(
        { status: response.status, error, token: token.slice(0, 8) },
        "Telegram API error (editMessageText)",
      );
      throw new Error(`Telegram API error: ${response.status}`);
    }

    logger.debug({ chatId, messageId }, "Telegram message edited");
  } catch (err) {
    logger.error(
      {
        chatId,
        messageId,
        error: err instanceof Error ? err.message : String(err),
      },
      "Failed to edit Telegram message",
    );
    throw err;
  }
}
