# OKSTours AI Agent

## Overview

A full-stack AI-powered customer service and CRM platform for OKSTours travel agency. The AI agent handles flight tickets, tour packages, hotel bookings, transfers, and visa inquiries in Uzbek, Russian, and English.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/okstours)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-4o-mini)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Charts**: Recharts
- **Build**: esbuild

## Features

- AI chat interface (responds in Uzbek/Russian/English based on customer language)
- Conversations management (Telegram, WhatsApp, Instagram, Web, SMS, Email)
- CRM-style leads management with segments (hot/warm/cold)
- Dashboard with statistics and activity feed
- **Operator Mode** — operator can take over conversations and reply manually
- **Follow-up System** — AI sends follow-up messages to inactive customers
- **Booking Confirmation** — confirm bookings with auto-confirmation message
- **Promo/Aksiyalar** — manage promotions; AI automatically mentions them to customers
- **Statistics** — daily/weekly/monthly charts with message, lead, and booking trends
- **Call Analysis** — analyze call transcripts with AI (sentiment, missed opportunities, recommendations)
- Auto-creates leads from new conversations
- Activity tracking

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run push-force` — force push DB schema (when type conflicts)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `conversations` — chat conversations with channel, status, customer info, operatorMode flag
- `messages` — individual messages with role (user/assistant/operator)
- `leads` — CRM leads with segment (hot/warm/cold), status, interest, destination, budget
- `promotions` — active promotions/discounts that AI includes in its system prompt
- `activity` — activity log for dashboard feed

## API Routes

### Frontend Pages
- `/` — Dashboard with stats and activity
- `/chat` — Live AI chat demo
- `/conversations` — Conversations list
- `/conversations/:id` — Conversation detail (operator mode, follow-up, messages)
- `/leads` — Leads CRM list
- `/leads/:id` — Lead detail (booking confirmation)
- `/promotions` — Promo/Aksiyalar management
- `/stats` — Time-series statistics (daily/weekly/monthly)
- `/call-analysis` — Call transcript AI analysis

### Backend API Endpoints
- `GET/POST /api/conversations` — list/create conversations
- `GET/PATCH /api/conversations/:id` — get/update conversation
- `GET /api/conversations/:id/messages` — get messages
- `POST /api/conversations/:id/operator-reply` — operator sends message
- `POST /api/conversations/:id/follow-up` — send AI follow-up
- `POST /api/chat` — AI chat response
- `GET/POST /api/leads` — list/create leads
- `GET/PATCH /api/leads/:id` — get/update lead
- `POST /api/leads/:id/book` — confirm booking
- `GET/POST /api/promotions` — list/create promotions
- `DELETE /api/promotions/:id` — delete promotion
- `POST /api/call-analysis` — analyze call transcript
- `GET /api/stats/dashboard` — dashboard stats
- `GET /api/stats/activity` — recent activity
- `GET /api/stats/time-series?period=daily|weekly|monthly` — time-series data

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
