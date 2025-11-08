@echo off
REM Clinic Parking App - Development Startup Script for Windows
REM This script sets up and starts the development environment

echo.
echo Starting Clinic Parking App...
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found!
    echo.
    echo Creating .env file from template...
    (
        echo # Database Configuration
        echo DATABASE_URL="postgresql://user:password@localhost:5432/clinic_parking?schema=public"
        echo.
        echo # Stripe Configuration
        echo STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
        echo STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
        echo.
        echo # App Configuration
        echo NEXT_PUBLIC_BASE_URL="http://localhost:3000"
    ) > .env
    echo.
    echo [WARNING] Please edit .env with your actual credentials
    echo Press any key when ready to continue...
    pause >nul
) else (
    echo [OK] .env file found
)

REM Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ and try again
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Install dependencies if needed
if not exist node_modules (
    echo.
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies found
)

REM Generate Prisma Client
echo.
echo Generating Prisma client...
call npm run prisma:generate >nul 2>&1
echo [OK] Prisma client generated

REM Run migrations
echo.
echo Setting up database...
call npm run migrate:deploy >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Database migrations applied
) else (
    echo [WARNING] Could not connect to database or migrations failed
    echo Make sure your DATABASE_URL in .env is correct
    echo.
    set /p continue="Continue anyway? (y/N): "
    if /i not "%continue%"=="y" (
        echo Exiting...
        pause
        exit /b 1
    )
)

REM Ask about seeding
echo.
set /p seed="Seed database with initial data? (y/N): "
if /i "%seed%"=="y" (
    call npm run db:seed
    if %errorlevel% equ 0 (
        echo [OK] Database seeded
    ) else (
        echo [WARNING] Seeding failed (might be already seeded)
    )
)

echo.
echo ================================================
echo.
echo [OK] Setup complete!
echo.
echo Starting development server...
echo.
echo Your app will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ================================================
echo.

REM Start the development server
call npm run dev
