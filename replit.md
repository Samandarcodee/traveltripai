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
- **AI**: OpenAI via Replit AI Integrations (gpt-5-mini)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Features

- AI chat interface for customers (responds in Uzbek/Russian/English)
- Conversations management (Telegram, WhatsApp, Instagram, Web, SMS, Email)
- CRM-style leads management with segments (hot/warm/cold)
- Dashboard with statistics and activity feed
- Auto-creates leads from new conversations
- Activity tracking

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `conversations` — chat conversations with channel, status, customer info
- `messages` — individual messages with role (user/assistant/operator)
- `leads` — CRM leads with segment, interest, destination, budget
- `activity` — activity log for dashboard feed

## Routes

- `/` — Dashboard
- `/chat` — Live AI chat demo
- `/conversations` — Conversations list
- `/conversations/:id` — Conversation detail
- `/leads` — Leads CRM list
- `/leads/:id` — Lead detail

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
