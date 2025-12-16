# Overview

This is a psychology practice management system built with a modern full-stack architecture. The application serves as a comprehensive platform for managing appointments, psychologists, rooms, financial transactions, and patient interactions. It features role-based access control, real-time scheduling, and integrates with external services like WhatsApp and Google Calendar for enhanced communication and scheduling capabilities.

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
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Session Storage**: PostgreSQL-backed session store for scalability

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