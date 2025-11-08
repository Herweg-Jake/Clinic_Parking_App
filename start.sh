#!/bin/bash

# Clinic Parking App - Development Startup Script
# This script sets up and starts the development environment

set -e  # Exit on error

echo "🚗 Starting Clinic Parking App..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if .env file exists
print_step "Checking environment configuration..."
if [ ! -f .env ]; then
    print_warning ".env file not found!"
    echo ""
    echo "Creating .env file from template..."
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/clinic_parking?schema=public"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# App Configuration
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Optional: Supabase (if using)
# NEXT_PUBLIC_SUPABASE_URL=""
# NEXT_PUBLIC_SUPABASE_ANON_KEY=""
# SUPABASE_SERVICE_ROLE_KEY=""
EOF
    print_warning "Please edit .env with your actual credentials before continuing"
    echo ""
    echo "Press Enter when you've updated .env, or Ctrl+C to exit..."
    read
else
    print_success ".env file found"
fi

# Check Node.js installation
print_step "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi
NODE_VERSION=$(node -v)
print_success "Node.js $NODE_VERSION"

# Check npm installation
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi
NPM_VERSION=$(npm -v)
print_success "npm $NPM_VERSION"

# Install dependencies
print_step "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies found"
    # Optional: Check if package.json changed
    if [ package.json -nt node_modules ]; then
        print_warning "package.json is newer than node_modules. Running npm install..."
        npm install
        print_success "Dependencies updated"
    fi
fi

# Generate Prisma Client
print_step "Generating Prisma client..."
npm run prisma:generate > /dev/null 2>&1
print_success "Prisma client generated"

# Check database connection and run migrations
print_step "Setting up database..."
if npm run migrate:deploy > /dev/null 2>&1; then
    print_success "Database migrations applied"
else
    print_warning "Could not connect to database or migrations failed"
    echo "  This might be expected if you haven't set up your database yet."
    echo "  Make sure your DATABASE_URL in .env is correct."
    echo ""
    echo "  Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_error "Exiting..."
        exit 1
    fi
fi

# Optional: Seed the database
print_step "Checking if database needs seeding..."
echo "  Do you want to seed the database with initial data? (spots A1-A20, etc.) (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    if npm run db:seed; then
        print_success "Database seeded successfully"
    else
        print_warning "Database seeding failed (this might be expected if already seeded)"
    fi
else
    print_success "Skipping database seeding"
fi

echo ""
print_success "Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_step "Starting development server..."
echo ""
echo -e "${GREEN}Your app will be available at:${NC} ${BLUE}http://localhost:3000${NC}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the development server
npm run dev
