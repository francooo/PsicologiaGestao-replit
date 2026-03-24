# Overview

This is a psychology practice management system built with a modern full-stack architecture. The application serves as a comprehensive platform for managing appointments, psychologists, rooms, financial transactions, and patient interactions. It features role-based access control, real-time scheduling, and integrates with external services like WhatsApp and Google Calendar for enhanced communication and scheduling capabilities.

## Recent Updates (March 2026)
- ✅ Commission Module (Módulo de Comissionamento): Admin-only `/admin/comissoes` page for managing psychologist financial repasses
  - New DB tables: `commission_payout_configs`, `commissions`, `commission_items`
  - Backend routes at `server/routes/commissions.ts` mounted at `/api/admin/commissions`
  - Per-psychologist payout config: percentual (%) or fixed (R$) repasse per booking
  - Generate commissions from room bookings in a date range, with preview before confirming
  - Status workflow: pending → paid (with payment date/method/notes) or cancelled
  - Dashboard KPI cards: totalPendente, totalPago, numPsicologas, numLocacoes
  - Detail modal showing individual booking items per commission
  - "Comissões" sidebar + mobile nav link (admin only, HandCoins icon)
- ✅ Added Psychologist Professional Profile (/perfil) and Admin Psychologists screen (/admin/psicologas)
- ✅ Extended `psychologists` table with `phone`, `crp_number`, `started_at_clinic` columns
- ✅ Created `specialization_areas` and `psychologist_specializations` tables (35 pre-seeded areas, 7 categories)
- ✅ Built backend routes: `server/routes/profile.ts` (GET/PATCH /api/profile, PUT /api/profile/specializations, POST /api/profile/avatar), `server/routes/specialization-areas.ts` (GET/POST), `server/routes/admin-psychologists.ts` (full CRUD)
- ✅ Created reusable `SpecializationChipSelector` component with search, toggle, and custom area creation
- ✅ Psychologist /perfil page: avatar upload, professional info form, bio, specialization chips, admin-only fields (email, startedAtClinic) with lock icon
- ✅ Admin /admin/psicologas page: card grid, search/filter, edit modal with all fields + admin-only fields, toggle active status, stats panel
- ✅ Updated sidebar: psychologists → /admin/psicologas (admin), /psychologists (receptionist); Meu Perfil → /perfil (psychologist), /profile (others)
- ✅ Added Meetings module (Módulo de Reuniões) with Google Meet integration
- ✅ Created `meetings` table in PostgreSQL schema
- ✅ Extended Google Calendar service with Gmail scope, `createMeetingEvent()` (conferenceData v1), and `sendMeetLinkEmail()` (Gmail API, HTML template)
- ✅ Built full meetings backend (`server/routes/meetings.ts`): list, get, create, update, start, end, notes, send-link, cancel/delete
- ✅ Created `client/src/pages/meetings.tsx` with summary cards, filter tabs, meeting cards, active session banner with live timer, create/end/notes modals
- ✅ Added "Reuniões" sidebar item with animated green "Ativa" badge for active sessions
- ✅ Registered `/reunioes` protected route in App.tsx

## Recent Updates (December 2025)
- ✅ Implemented invoice (nota fiscal) management system
- ✅ Created invoice upload with PDF/JPG/PNG support (5MB max)
- ✅ Added user invoice page for uploading and viewing personal invoices
- ✅ Added admin invoice dashboard with submission tracking by month
- ✅ Implemented role-based access control for invoice routes
- ✅ Fixed psychologist creation validation errors for hourlyRate field
- ✅ Enhanced financial transaction modal UI with improved visibility
- ✅ Corrected schema validation for amount fields in transactions

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type-safe development
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom theme support and CSS variables
- **State Management**: TanStack Query for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Management**: Express sessions with PostgreSQL store for persistence
- **API Design**: RESTful API with standardized error handling and middleware

## Data Storage
- **Database**: PostgreSQL (Replit built-in, Neon-backed)
- **ORM**: Drizzle ORM with node-postgres (pg) driver for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Session Storage**: Memory store for sessions

## Authentication & Authorization
- **Strategy**: Session-based authentication with secure password hashing using scrypt
- **Password Security**: Salt-based hashing with timing-safe comparison
- **Role-Based Access**: Multi-role system (admin, psychologist, receptionist)
- **Protected Routes**: Client-side route protection with loading states
- **Session Configuration**: Secure cookies with same-site strict policy

## External Dependencies

- **Database**: Neon PostgreSQL serverless database
- **Email Service**: Nodemailer with SMTP configuration for password recovery
- **WhatsApp Integration**: Facebook Graph API for appointment notifications and reminders
- **Google Calendar**: Google Calendar API with OAuth2 for calendar synchronization
- **File Storage**: Local file system for profile image uploads with Multer
- **UI Components**: Radix UI ecosystem for accessible, unstyled components
- **Charts**: Recharts for financial reporting and analytics visualization
- **Deployment**: Replit hosting with environment variable configuration