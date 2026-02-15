# PT Clinic Parking App

A modern parking management system for physical therapy clinics. Users can scan QR codes at parking spots to check in or pay for visitor parking via Stripe.

## Features

- 🚗 **QR Code Check-in** - Scan and check in to parking spots
- 💳 **Stripe Payment Integration** - Secure payment for visitors
- 🎫 **Permit Management** - PT patient and staff permit system
- 📊 **Admin Dashboard** - Manage sessions and permits
- 🌓 **Dark Mode Support** - Beautiful UI with light/dark themes
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop

## Quick Start

### One-Command Startup

The easiest way to get started:

**macOS/Linux:**
```bash
./start.sh
```

**Windows:**
```cmd
start.bat
```

**Or using npm:**
```bash
npm run startup
```

This will automatically:
- Check for environment variables
- Install dependencies
- Generate Prisma client
- Run database migrations
- Optionally seed the database
- Start the development server

### Manual Setup

If you prefer to set up manually:

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials:**
   - Database URL (PostgreSQL)
   - Stripe API keys
   - Base URL

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up the database:**
   ```bash
   npm run migrate:deploy
   npm run db:seed  # Optional: adds spots A1-A20
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Environment Variables

Required environment variables (see `.env.example` for full template):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/clinic_parking"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

## Database Setup

This app uses PostgreSQL with Prisma ORM.

### Local PostgreSQL

1. Install PostgreSQL
2. Create a database:
   ```sql
   CREATE DATABASE clinic_parking;
   ```
3. Update `DATABASE_URL` in `.env`

### Supabase (Recommended for Production)

1. Create a project at [supabase.com](https://supabase.com)
2. Get your connection string from Project Settings → Database
3. Update `DATABASE_URL` in `.env`

## Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your test API keys from the Dashboard
3. For webhooks:
   - Install Stripe CLI: `stripe login`
   - Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Project Structure

```
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── checkin/           # Check-in page
│   │   ├── success/           # Payment success page
│   │   └── status/            # System status page
│   └── lib/                   # Shared utilities
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── start.sh                   # Startup script (Unix)
├── start.bat                  # Startup script (Windows)
└── .env.example               # Environment template
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run startup` - Run startup script
- `npm run prisma:generate` - Generate Prisma client
- `npm run migrate:dev` - Run migrations (dev)
- `npm run migrate:deploy` - Run migrations (production)
- `npm run db:seed` - Seed database with initial data
- `npm run test:integrations` - Run integration checks for DB, Stripe, and Twilio

## Usage

### For Patients/Visitors

1. Scan QR code at parking spot
2. Enter license plate
3. Choose "PT Patient" or "Visitor (Pay)"
4. PT patients with permits are approved automatically
5. Visitors pay via Stripe and receive confirmation

### For Admins

1. Navigate to `/admin/active`
2. View active/expired sessions
3. Extend sessions with +15m button
4. Manage permits at `/admin/permits`
5. Import/export permits via CSV

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Prisma
- **Payments:** Stripe
- **Auth:** Supabase (optional)

## License

MIT

## Support

For issues or questions, please contact the clinic front desk or open an issue on GitHub.
