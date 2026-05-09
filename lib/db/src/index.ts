import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export * from "./schema";

async function init() {
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    return { pool, db };
  }

  // Development: in-memory PostgreSQL via pg-mem (no external DB needed)
  console.warn(
    "[db] DATABASE_URL not set — using in-memory dev DB (data resets on restart)",
  );
  const { newDb } = await import("pg-mem");
  const mem = newDb();
  const { Pool: MemPool } = mem.adapters.createPg();
  const rawPool = new MemPool();

  // pg-mem doesn't support 'types.getTypeParser' or 'rowMode: array' used by drizzle-orm v0.45.
  // We strip both from query configs and convert object rows → array rows when rowMode was requested.
  function adaptQuery(origQuery: Function, config: any, values?: any[]) {
    if (!config || typeof config !== "object") return origQuery(config, values);
    const needsArrayRows = config.rowMode === "array";
    const { types: _t, rowMode: _r, ...rest } = config;
    const hasStripped = "types" in config || "rowMode" in config;
    const promise: Promise<any> = hasStripped ? origQuery(rest, values) : origQuery(config, values);
    if (!needsArrayRows) return promise;
    return promise.then((result: any) => {
      if (result?.rows && result?.fields) {
        const names: string[] = result.fields.map((f: any) => f.name);
        result.rows = result.rows.map((row: any) => names.map((n) => row[n]));
      }
      return result;
    });
  }

  function patchClient(client: any) {
    const origQuery = client.query.bind(client);
    client.query = (config: any, values?: any[]) => adaptQuery(origQuery, config, values);
    return client;
  }

  const origConnect = rawPool.connect.bind(rawPool);
  rawPool.connect = async function (...args: any[]) {
    const client = await origConnect(...args);
    return patchClient(client);
  } as any;

  const origPoolQuery = rawPool.query.bind(rawPool);
  rawPool.query = (config: any, values?: any[]) => adaptQuery(origPoolQuery, config, values) as any;

  const pool = rawPool as unknown as pg.Pool;
  const db = drizzle(pool, { schema });

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        channel TEXT NOT NULL DEFAULT 'web',
        status TEXT NOT NULL DEFAULT 'active',
        customer_name TEXT,
        customer_phone TEXT,
        lead_id INTEGER,
        last_message TEXT,
        last_message_at TIMESTAMPTZ,
        operator_mode INTEGER NOT NULL DEFAULT 0,
        external_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT,
        phone TEXT,
        email TEXT,
        segment TEXT NOT NULL DEFAULT 'cold',
        interest TEXT,
        destination TEXT,
        budget TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT,
        conversation_id INTEGER,
        airline TEXT,
        flight_number TEXT,
        booking_number TEXT,
        departure_date TEXT,
        arrival_date TEXT,
        luggage TEXT,
        hand_luggage TEXT,
        tariff TEXT,
        passengers_count TEXT,
        service_class TEXT,
        payment_status TEXT,
        age_category TEXT,
        lead_source TEXT,
        birthday TEXT,
        assigned_to TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS activity (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        conversation_id INTEGER,
        lead_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        discount TEXT,
        destination TEXT,
        valid_until TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL DEFAULT 'general',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER,
        conversation_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'medium',
        assigned_to TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO leads (name, phone, segment, status, destination, budget, notes) VALUES
        ('Алексей Иванов', '+998901234567', 'hot', 'new', 'Дубай', '$2000', 'Интересуется туром на 7 ночей'),
        ('Мария Смирнова', '+998911111111', 'warm', 'contacted', 'Стамбул', '$1500', 'Хочет тур на двоих'),
        ('Бехзод Рашидов', '+998921234567', 'cold', 'new', 'Анталья', '$1200', NULL),
        ('Дилноза Юсупова', '+998931234567', 'hot', 'qualified', 'Бали', '$3000', 'Медовый месяц'),
        ('Сергей Петров', '+998941234567', 'warm', 'booked', 'Египет', '$1800', 'Уже забронировал');

      INSERT INTO conversations (channel, status, customer_name, customer_phone, last_message, last_message_at, lead_id) VALUES
        ('telegram', 'active', 'Алексей Иванов', '+998901234567', 'Здравствуйте! Интересует тур в Дубай', NOW(), 1),
        ('web', 'pending', 'Мария Смирнова', '+998911111111', 'Когда можно вылететь?', NOW() - INTERVAL '2 hours', 2),
        ('telegram', 'closed', 'Сергей Петров', '+998941234567', 'Спасибо! Жду подтверждения.', NOW() - INTERVAL '1 day', 5);

      INSERT INTO messages (conversation_id, role, content) VALUES
        (1, 'user', 'Здравствуйте! Интересует тур в Дубай'),
        (1, 'assistant', 'Здравствуйте! Я Aziz из OKSTours. Отличный выбор — Дубай! Когда планируете поездку?'),
        (2, 'user', 'Когда можно вылететь?'),
        (3, 'user', 'Спасибо! Жду подтверждения.');

      INSERT INTO templates (category, title, content, sort_order) VALUES
        ('greeting', 'Приветствие', 'Здравствуйте! Меня зовут Aziz, я менеджер OKSTours. Чем могу помочь?', 1),
        ('tour', 'Предложение тура', 'Отличный выбор! Мы предлагаем тур за {price}. Когда планируете поездку?', 2),
        ('payment', 'Детали оплаты', 'Для бронирования необходим аванс 30%. Оплата картой или переводом.', 3);

      INSERT INTO settings (key, value) VALUES
        ('ai_enabled', 'true'),
        ('telegram_bot_username', ''),
        ('openai_model', 'gpt-4o-mini');

      INSERT INTO activity (type, description, conversation_id, lead_id) VALUES
        ('new_lead', 'Новый лид: Алексей Иванов (Дубай)', 1, 1),
        ('new_message', 'Сообщение от Мария Смирнова', 2, 2),
        ('status_change', 'Лид Сергей Петров → Забронировано', 3, 5);
    `);
  } finally {
    client.release();
  }

  return { pool, db };
}

// Top-level await — module initialization waits for DB before any import resolves
export const { pool, db } = await init();

// Also export initDb for explicit control (used by server startup in older flows)
export async function initDb() {
  // No-op: initialization happens at module load via top-level await above
}
