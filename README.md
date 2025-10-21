# 🌟 Funding the Commons Platform

> A comprehensive event management and application platform built for hosting residency programs, hackathons, and community events with advanced administrative tools and automated workflows.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596be)](https://trpc.io/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5-2d3748)](https://prisma.io/)
[![Mantine](https://img.shields.io/badge/Mantine-8.1-339af0)](https://mantine.dev/)

## 🚀 Overview

The Funding the Commons Platform is a sophisticated full-stack application designed to streamline the entire lifecycle of events and programs. From application submission to final participant onboarding, it provides a seamless experience for organizers, applicants, reviewers, and participants.

### 🎯 Key Capabilities

- **Multi-Event Management** - Host multiple simultaneous events with distinct branding and configurations
- **Advanced Application System** - Dynamic forms with conditional logic and auto-save functionality  
- **AI-Powered Evaluation** - Automated application scoring with bias detection and audit trails
- **Role-Based Access Control** - Granular permissions for admins, staff, mentors, sponsors, and participants
- **Automated Email Communications** - Template-driven notifications with tracking and analytics
- **Real-Time Dashboard** - Comprehensive analytics and progress monitoring for administrators
- **Telegram Integration** - Seamless communication and bulk messaging capabilities

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)

## ✨ Features

### 🏛️ Event Management
- **Multi-Event Architecture** - Support for residency programs, hackathons, and custom event types
- **Dynamic Branding** - Per-event customization with themes, colors, and content
- **Application Periods** - Configurable open/close dates with late-pass system
- **Capacity Management** - Participant limits and waitlist functionality

### 📝 Application System
- **Dynamic Forms** - Configurable application forms with conditional fields
- **Auto-Save Technology** - Real-time draft saving with conflict resolution
- **File Uploads** - Document and media attachment support
- **Validation Engine** - Client-side and server-side validation with smart error handling
- **Progress Tracking** - Visual completion indicators and guided workflows

### 🧠 AI-Powered Evaluation
- **Automated Scoring** - OpenAI integration for consistent application evaluation
- **Bias Detection** - Advanced analytics to identify and mitigate evaluation bias
- **Consensus Building** - Multi-reviewer workflows with weighted scoring
- **Audit Trails** - Complete evaluation history and decision tracking
- **Training Data** - Continuous improvement through evaluation learning

### 👥 User Management & Roles
- **Flexible Role System** - Admin, staff, mentor, sponsor, and participant roles
- **Permission Matrix** - Granular access control for all platform features
- **Invitation System** - Secure token-based user onboarding
- **Profile Management** - Comprehensive user profiles with skill tracking
- **Activity Monitoring** - User engagement and platform usage analytics

### 📧 Communication System
- **Email Templates** - React Email components with consistent branding
- **Automated Notifications** - Status change alerts and deadline reminders
- **Bulk Messaging** - Targeted communication to user segments
- **Telegram Integration** - Direct messaging and channel management
- **Email Analytics** - Open rates, click tracking, and engagement metrics

### 📊 Analytics & Reporting
- **Real-Time Dashboards** - Live statistics and key performance indicators
- **Application Analytics** - Acceptance rates, demographics, and trends
- **User Engagement** - Activity tracking and participation metrics
- **Export Capabilities** - CSV downloads and data visualization
- **Financial Tracking** - Sponsorship and budget management tools

### 🔒 Security & Privacy
- **Multi-Provider Authentication** - Email/password, Discord, and Google OAuth
- **Data Encryption** - End-to-end protection for sensitive information
- **GDPR Compliance** - Privacy controls and data deletion workflows
- **Audit Logging** - Complete activity tracking for compliance
- **Rate Limiting** - API protection and abuse prevention

## 🛠️ Technology Stack

### Core Framework
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router for optimal performance
- **[TypeScript](https://typescriptlang.org/)** - Type-safe development throughout the stack
- **[React 19](https://react.dev/)** - Latest React features with concurrent rendering

### Backend & Data
- **[tRPC](https://trpc.io/)** - End-to-end type safety between client and server
- **[Prisma](https://prisma.io/)** - Next-generation ORM with type-safe database access
- **[PostgreSQL](https://postgresql.org/)** - Robust relational database for production
- **[NextAuth.js](https://next-auth.js.org/)** - Complete authentication solution

### Frontend & UI
- **[Mantine](https://mantine.dev/)** - Modern React components library
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[React Query](https://tanstack.com/query)** - Powerful data synchronization
- **[React Hook Form](https://react-hook-form.com/)** - Performant form management

### Communication & AI
- **[React Email](https://react.email/)** - Component-based email templates
- **[Postmark](https://postmarkapp.com/)** - Reliable email delivery service
- **[OpenAI API](https://openai.com/)** - AI-powered application evaluation
- **[Telegram API](https://core.telegram.org/)** - Direct messaging integration

### Development & Deployment
- **[Bun](https://bun.sh/)** - Fast all-in-one JavaScript runtime and package manager
- **[Vercel](https://vercel.com/)** - Optimized hosting and deployment platform
- **[ESLint](https://eslint.org/)** - Code quality and consistency enforcement
- **[Prettier](https://prettier.io/)** - Code formatting automation

### Testing & Quality Assurance
- **[Vitest](https://vitest.dev/)** - Lightning-fast unit testing framework
- **[Playwright](https://playwright.dev/)** - End-to-end testing across browsers
- **[Testing Library](https://testing-library.com/)** - Simple and complete testing utilities
- **[MSW](https://mswjs.io/)** - API mocking for reliable tests

## 🏗️ Architecture

### Application Structure
```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── admin/             # Administrative interface and tools
│   ├── events/            # Event management and participation
│   ├── auth/              # Authentication flows and pages
│   ├── api/               # API routes and webhooks
│   └── _components/       # Shared React components
├── server/                # Server-side business logic
│   ├── api/               # tRPC router definitions
│   ├── auth/              # Authentication configuration
│   ├── email/             # Email templates and service
│   └── services/          # Business logic and integrations
├── lib/                   # Utility functions and configurations
├── hooks/                 # Custom React hooks
├── styles/                # Global styles and themes
└── types/                 # TypeScript type definitions
```

### Data Architecture
The platform uses a relational data model with the following core entities:

- **Users** - Authentication, profiles, and role assignments
- **Events** - Event definitions, configurations, and branding
- **Applications** - User applications with dynamic form responses
- **Evaluations** - Review scores, comments, and decision tracking
- **Communications** - Email history, templates, and analytics
- **Roles** - Permission system and access control

### API Design
- **Type-Safe APIs** - Full TypeScript integration from client to database
- **Procedure-Based** - tRPC procedures for predictable request/response patterns
- **Middleware** - Authentication, authorization, and logging layers
- **Error Handling** - Structured error responses with user-friendly messages

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** or **Bun 1.0+**
- **PostgreSQL 14+** database
- **Git** for version control

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ftc-platform.git
   cd ftc-platform
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Fill in the required environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/ftc_platform"
   
   # Authentication
   AUTH_SECRET="your-secret-key"
   AUTH_DISCORD_ID="your-discord-client-id"
   AUTH_DISCORD_SECRET="your-discord-client-secret"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # Email Service
   POSTMARK_SERVER_TOKEN="your-postmark-token"
   EMAIL_MODE="development"
   TEST_EMAIL_OVERRIDE="your-test-email@example.com"
   ADMIN_EMAIL="admin@yourorg.com"
   
   # External Services
   NOTION_TOKEN="your-notion-token"
   OPENAI_API_KEY="your-openai-key"
   MASTRA_API_KEY="your-mastra-key"
   ```

4. **Initialize the database**
   ```bash
   bun run db:generate
   bun run db:seed
   ```

5. **Start the development server**
   ```bash
   bun run dev
   ```

The application will be available at `http://localhost:3000`.

### First Steps
1. **Create an admin account** - Register with your admin email address
2. **Set up your first event** - Navigate to `/admin/events` to create an event
3. **Configure application form** - Customize the application questions and fields
4. **Test the application flow** - Submit a test application to verify functionality

## 💻 Development

### Development Commands
```bash
# Development
bun run dev              # Start development server with hot reload
bun run build           # Build production application
bun run start           # Start production server
bun run preview         # Build and preview production locally

# Database
bun run db:generate     # Generate Prisma client after schema changes
bun run db:push         # Push schema to database (development only)
bun run db:migrate      # Deploy migrations (production)
bun run db:seed         # Seed database with sample data
bun run db:studio       # Open Prisma Studio database browser

# Code Quality
bun run check           # Run comprehensive linting and type checking
bun run lint            # ESLint code analysis
bun run lint:fix        # Auto-fix linting issues
bun run typecheck       # TypeScript compilation check
bun run format:check    # Prettier formatting check
bun run format:write    # Apply Prettier formatting

# Testing
bun run test            # Run all tests
bun run test:unit       # Unit tests only
bun run test:integration # Integration tests only
bun run test:e2e        # End-to-end tests with Playwright
bun run test:coverage   # Generate coverage reports
bun run test:watch      # Watch mode for development
```

### Code Quality Standards

The platform enforces strict code quality standards:

- **ESLint Configuration** - Comprehensive linting rules with TypeScript integration
- **Type Safety** - No `any` types, strict null checks, and proper error handling
- **Formatting** - Automated code formatting with Prettier
- **Testing** - Unit, integration, and E2E test coverage requirements
- **Documentation** - JSDoc comments for public APIs and complex logic

### Development Workflow

1. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/your-feature-name
   
   # Make changes and run quality checks
   bun run check
   bun run test
   
   # Commit with conventional commit format
   git commit -m "feat: add new feature description"
   ```

2. **Database Changes**
   ```bash
   # Modify schema in prisma/schema.prisma
   # Generate migration
   bun run db:generate
   
   # Apply to development database
   bun run db:push  # Development only
   ```

3. **Testing Strategy**
   - **Unit Tests** - Individual component and function testing
   - **Integration Tests** - API endpoint and database interaction testing
   - **E2E Tests** - Complete user workflow validation
   - **Performance Tests** - Form rendering and interaction optimization

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect repository to Vercel**
   - Import project from GitHub/GitLab
   - Configure build settings (auto-detected)

2. **Environment variables**
   - Copy all production environment variables
   - Set `EMAIL_MODE="production"`
   - Configure production database URL

3. **Database setup**
   ```bash
   # Deploy migrations to production
   bun run db:migrate
   ```

### Manual Deployment

```bash
# Build application
bun run build

# Start production server
bun run start
```

### Environment Configuration

**Development**
- Emails redirect to `TEST_EMAIL_OVERRIDE`
- Database can use SQLite for local development
- Debug logging enabled

**Staging**
- Emails clearly marked with `[STAGING]` prefix
- Production-like database configuration
- Error tracking enabled

**Production**
- All emails sent to actual recipients
- Full error monitoring and analytics
- Performance optimization enabled

## 📚 API Documentation

### tRPC Router Structure

The API is organized into logical routers:

#### Core Routers
- **`event`** - Event creation, management, and configuration
- **`application`** - Application submission, review, and status management
- **`user`** - User management, profiles, and authentication
- **`role`** - Role assignment and permission management

#### Feature Routers
- **`evaluation`** - Application review and scoring system
- **`communication`** - Email templates and messaging
- **`invitation`** - User invitation and onboarding
- **`profile`** - Extended user profile management

#### Integration Routers
- **`telegramAuth`** - Telegram bot integration and messaging
- **`email`** - Email service and template management
- **`sponsor`** - Sponsor management and coordination
- **`mentorship`** - Mentor assignment and tracking

### Example API Usage

```typescript
// Get event applications with filtering
const applications = await api.application.getApplications.useQuery({
  eventId: "event-id",
  status: "UNDER_REVIEW",
  page: 1,
  limit: 20
});

// Submit application evaluation
const evaluation = await api.evaluation.create.useMutation({
  applicationId: "app-id",
  scores: { technical: 8, experience: 7, potential: 9 },
  comments: "Strong technical background...",
  recommendation: "ACCEPT"
});

// Send bulk email to participants
const emailResult = await api.communication.sendBulkEmail.useMutation({
  eventId: "event-id",
  templateName: "welcome",
  recipientFilter: { status: "ACCEPTED" }
});
```

### Authentication & Authorization

All API endpoints require appropriate authentication and authorization:

```typescript
// Example protected procedure
export const createEvent = protectedProcedure
  .input(createEventSchema)
  .use(requireRole(['admin', 'staff']))
  .mutation(async ({ ctx, input }) => {
    // Implementation
  });
```

## 🤝 Contributing

We welcome contributions from the community! Please follow these guidelines:

### Getting Involved

1. **Fork the repository** and create a feature branch
2. **Check existing issues** or create a new one for discussion
3. **Follow code standards** and include appropriate tests
4. **Submit a pull request** with clear description of changes

### Development Standards

- **Type Safety** - All code must be properly typed
- **Testing** - Include tests for new features and bug fixes
- **Documentation** - Update README and code comments as needed
- **Conventional Commits** - Use standard commit message format

### Pull Request Process

1. **Code Review** - All changes require review from maintainers
2. **Quality Checks** - Automated testing and linting must pass
3. **Documentation** - Update relevant documentation
4. **Testing** - Verify changes work in development environment

### Code of Conduct

This project follows a professional code of conduct. Please be respectful and constructive in all interactions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **T3 Stack** - Foundation and best practices
- **Vercel** - Deployment and hosting platform
- **Mantine** - Beautiful and accessible UI components
- **OpenAI** - AI-powered evaluation capabilities
- **Postmark** - Reliable email delivery service

---

**Built with ❤️ for the Funding the Commons community**

For questions, support, or contributions, please visit our [GitHub repository](https://github.com/your-org/ftc-platform) or contact the development team.
