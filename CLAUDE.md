# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Database Operations
- `bun run db:generate` - Generate Prisma client after schema changes (development migrations)
- `bun run db:push` - Push schema changes to database (development, no migration file)
- `bun run db:migrate` - Deploy migrations (production)
- `bun run db:seed` - Seed database with initial data
- `bun run db:studio` - Open Prisma Studio for database inspection

### Development & Build
- `bun run dev` - Start development server with Turbo
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run preview` - Build and start production server

### Code Quality
- `bun run check` - Run linting and type checking (comprehensive check)
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Run ESLint with auto-fix
- `bun run typecheck` - Run TypeScript type checking
- `bun run format:check` - Check code formatting
- `bun run format:write` - Format code with Prettier

## Architecture Overview

This is a T3 Stack application with the following key components:

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Authentication**: NextAuth.js with Discord and Google providers
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS with Mantine UI components
- **Type Safety**: TypeScript with Zod validation
- **API Layer**: tRPC for end-to-end type safety
- **Package Manager**: Bun

### Core Structure
- `src/app/` - Next.js App Router pages and components
- `src/server/` - Backend API routes, tRPC procedures, and database logic
- `src/trpc/` - Client-side tRPC configuration
- `prisma/` - Database schema and migrations

### Key Features
- **Event Management**: Events, hackathons, teams, and projects
- **Sponsorship Tracking**: Sponsors with cryptocurrency integration via CoinGecko API
- **Contact Management**: Contact tracking with Notion integration
- **Authentication**: Multi-provider OAuth with session management
- **User Roles**: Event-specific role assignments

### Database Schema
The application uses a complex relational schema centered around:
- **Events**: Core event entity with hackathon extensions
- **Users**: Authentication and role management
- **Sponsors**: Company tracking with GeckoCoin integration
- **Contacts**: Contact management with optional sponsor relationships
- **Teams & Projects**: Hackathon team and project tracking
- **Judging System**: Scoring and evaluation framework

### API Integration
- **Google APIs**: Gmail and Contacts integration via OAuth scopes
- **CoinGecko API**: Cryptocurrency data for sponsor tracking
- **Notion API**: Contact synchronization capabilities

### Authentication Configuration
- Custom redirect handling in `src/server/auth/config.ts`
- Extended OAuth scopes for Google integration
- Session management with Prisma adapter

## Environment Variables

Required environment variables (see `.env.example`):
- `AUTH_SECRET` - NextAuth secret
- `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` - Discord OAuth
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth (not in example, but used)
- `DATABASE_URL` - PostgreSQL connection string
- `NOTION_TOKEN` - Notion API token
- `NOTION_CONTACTS_DATABASE_ID` - Notion contacts database
- `NOTION_EVENTS_DATABASE_ID` - Notion events database

## Database Setup

Start the database with the provided script:
```bash
./start-database.sh
```

Always run `bun run db:generate` after making schema changes to regenerate the Prisma client.

## tRPC Routers

Available tRPC routers in `src/server/api/routers/`:
- `post` - Basic post operations
- `contact` - Contact management
- `sponsor` - Sponsor operations
- `event` - Event management
- `coinGecko` - Cryptocurrency data integration