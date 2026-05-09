/**
 * In-memory PostgreSQL for local development.
 * Used automatically when DATABASE_URL is not set.
 * Powered by pg-mem — no external database needed.
 */
import { newDb } from "pg-mem";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import {
  conversationsTable,
  messagesTable,
  leadsTable,
  activityTable,
  promotionsTable,
  templatesTable,
  settingsTable,
  tasksTable,
} from "./schema";

function createDevDb() {
  const mem = newDb();

  // Patch: pg-mem doesn't support `now()` timezone cast — use a shim
  mem.public.registerFunction({
    name: "now",
    returns: { type: "text" } as any,
    implementation: () => new Date().toISOString(),
  });

  // Build a fake pg.Pool from the pg-mem adapter
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  const db = drizzle(pool as any, { schema });

  return { pool, db };
}

export async function createAndMigrateDevDb() {
  const { pool, db } = createDevDb();

  // Create tables manually using raw SQL (pg-mem supports CREATE TABLE)
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
        valid_until TIMESTAMPTZ,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        lead_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMPTZ,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed demo data
    await client.query(`
      INSERT INTO leads (name, phone, segment, status, destination, budget, notes)
      VALUES
        ('Алексей Иванов', '+998901234567', 'hot', 'new', 'Дубай', '$2000', 'Интересуется туром на 7 ночей'),
        ('Мария Смирнова', '+998911111111', 'warm', 'contacted', 'Стамбул', '$1500', 'Хочет тур на двоих'),
        ('Бехзод Рашидов', '+998921234567', 'cold', 'new', 'Анталья', '$1200', NULL),
        ('Дилноза Юсупова', '+998931234567', 'hot', 'qualified', 'Бали', '$3000', 'Медовый месяц'),
        ('Сергей Петров', '+998941234567', 'warm', 'booked', 'Египет', '$1800', 'Уже забронировал')
      ON CONFLICT DO NOTHING;

      INSERT INTO conversations (channel, status, customer_name, customer_phone, last_message, last_message_at, lead_id)
      VALUES
        ('telegram', 'active', 'Алексей Иванов', '+998901234567', 'Здравствуйте! Интересует тур в Дубай', NOW(), 1),
        ('web', 'pending', 'Мария Смирнова', '+998911111111', 'Когда можно вылететь?', NOW() - INTERVAL '2 hours', 2),
        ('telegram', 'closed', 'Сергей Петров', '+998941234567', 'Спасибо! Жду подтверждения.', NOW() - INTERVAL '1 day', 5)
      ON CONFLICT DO NOTHING;

      INSERT INTO templates (category, title, content, sort_order)
      VALUES
        ('greeting', 'Приветствие', 'Здравствуйте! Меня зовут Aziz, я менеджер OKSTours. Чем могу помочь?', 1),
        ('tour', 'Предложение тура', 'Отличный выбор! Мы предлагаем тур в {destination} за {price}. Когда планируете поездку?', 2),
        ('payment', 'Детали оплаты', 'Для бронирования необходим аванс 30%. Оплата возможна картой или переводом.', 3)
      ON CONFLICT DO NOTHING;

      INSERT INTO settings (key, value)
      VALUES
        ('ai_enabled', 'true'),
        ('telegram_bot_username', ''),
        ('openai_model', 'gpt-4o-mini')
      ON CONFLICT (key) DO NOTHING;

      INSERT INTO activity (type, description, conversation_id, lead_id)
      VALUES
        ('new_lead', 'Новый лид: Алексей Иванов (Дубай)', 1, 1),
        ('new_message', 'Сообщение от Мария Смирнова', 2, 2),
        ('status_change', 'Лид Сергей Петров → Забронировано', 3, 5)
      ON CONFLICT DO NOTHING;
    `);
  } finally {
    client.release();
  }

  console.log("[dev-db] In-memory PostgreSQL ready with demo data");
  return { pool, db };
}
