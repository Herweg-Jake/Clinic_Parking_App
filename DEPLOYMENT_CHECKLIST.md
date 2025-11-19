# Nevada PT Parking App - Deployment Checklist

## 🔧 Initial Setup Required

### 1. Database Configuration (REQUIRED)
**Update pricing to $2/hour:**
```bash
npm run db:update-pricing
```
This updates:
- `rate_cents` from 500 ($5) to 200 ($2)
- `duration_minutes` from 120 to 60
- Sets `nevada_pt_code` to "NVPT2025"

**Verify the changes:**
```bash
npm run db:check
```

### 2. Nevada PT Access Code (REQUIRED)
**Current code:** `NVPT2025`

**To change the code:**
Option A - Via database (recommended):
```sql
UPDATE "Config" SET value = 'YOURNEWCODE', "updatedAt" = NOW()
WHERE key = 'nevada_pt_code';
```

Option B - Via Prisma Studio:
```bash
npx prisma studio
```
Then navigate to Config table and update the `nevada_pt_code` row.

**Share this code with:**
- All Nevada PT staff members
- Include in patient welcome emails/texts
- Post in patient waiting area (optional)

### 3. Stripe Configuration (REQUIRED)
**Set environment variables:**
```env
STRIPE_SECRET_KEY=sk_live_...          # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...    # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...       # From Stripe webhook setup
```

**Setup Stripe Webhook:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

**Test payments:**
- Use Stripe test card: 4242 4242 4242 4242
- Verify session creation in admin dashboard
- Check webhook events in Stripe dashboard

### 4. Admin User Setup (REQUIRED)
**Create first admin user:**
```bash
npm run admin:add
```
Follow prompts to enter:
- Email address (will be used for Supabase login)
- User will need to sign up via Supabase first

**Admin access URL:**
`https://your-domain.com/admin/active`
(No link on homepage - admins must know this URL)

### 5. Supabase Authentication (REQUIRED)
**Set environment variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

**Configure Supabase:**
1. Create Supabase project
2. Enable Email authentication
3. Configure email templates (optional)
4. Set up OAuth providers (optional)

### 6. QR Code Generation (REQUIRED)
**Generate QR codes for each spot (A1-A20):**

URLs to encode:
- Spot A1: `https://your-domain.com/checkin/A1`
- Spot A2: `https://your-domain.com/checkin/A2`
- ... through ...
- Spot A20: `https://your-domain.com/checkin/A20`

**Recommended QR Code Generator:**
- [QR Code Generator](https://www.qr-code-generator.com/)
- Size: At least 2" x 2" when printed
- Error correction: Medium (M) or High (H)

**Print and post QR codes:**
- Laminate for weather protection
- Mount at eye level in each parking spot
- Include text: "Scan to check in for parking"

---

## 🚀 Deployment Steps

### 1. Environment Variables
Set all required variables in your hosting platform:
```env
# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# App
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NODE_ENV=production
```

### 2. Database Migration
```bash
npm run migrate:deploy
npm run db:seed
npm run db:update-pricing
```

### 3. Build and Deploy
```bash
npm run build
npm start
```

### 4. Post-Deployment Verification
- [ ] Homepage loads correctly
- [ ] Can select parking spot
- [ ] Visitor payment flow works (test with Stripe test card)
- [ ] Nevada PT code verification works
- [ ] Admin login required for /admin/active
- [ ] Stripe webhook receiving events
- [ ] Email notifications (if configured)

---

## ✅ Testing Checklist

### Visitor Payment Flow
- [ ] Select "Pay for Parking"
- [ ] Choose spot from dropdown
- [ ] Enter license plate (test validation: try "ABC!@#" → should sanitize to "ABC")
- [ ] Select hours (1-12)
- [ ] Enter email/phone (optional)
- [ ] Verify total price calculation (hours × $2)
- [ ] Click "Continue to Payment"
- [ ] Complete Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Redirected to success page
- [ ] Session appears in admin dashboard

### Nevada PT Patient Flow
- [ ] Select "Nevada PT Patient"
- [ ] Choose spot from dropdown
- [ ] Enter license plate
- [ ] Enter code "NVPT2025" (or your custom code)
- [ ] Verify code validation (try wrong code → should show error)
- [ ] Click "Complete Check-In"
- [ ] See success message with expiration time
- [ ] Session appears in admin dashboard with source "nevada_pt_code"

### QR Code Flow
- [ ] Scan QR code for spot A1
- [ ] Spot should be pre-filled
- [ ] Can complete check-in/payment
- [ ] Manual spot entry still works

### Admin Dashboard
- [ ] Access /admin/active (should require login)
- [ ] Unauthenticated users redirected to login
- [ ] Non-admin users see forbidden error
- [ ] View active sessions
- [ ] View expired sessions
- [ ] Filter by license plate
- [ ] Filter by spot
- [ ] Extend session (+15 minutes)
- [ ] Refresh button works

### Input Validation
- [ ] License plate: Only A-Z, 0-9, max 8 chars
- [ ] Phone: Only digits, dashes, parens, spaces
- [ ] Email: Valid email format
- [ ] Nevada PT code: Only A-Z, 0-9, max 20 chars
- [ ] All invalid characters automatically removed

---

## 📋 Optional Enhancements (Future)

### Email Notifications
- [ ] Send confirmation email after payment
- [ ] Send expiration warning (15 min before)
- [ ] Send expired notification

### SMS Notifications (Twilio)
- [ ] Send confirmation text after check-in
- [ ] Send expiration warning
- [ ] Send expired notification

### Reporting
- [ ] Daily revenue report
- [ ] Usage analytics (peak hours, average duration)
- [ ] Visitor vs. PT patient ratio

### UI Improvements
- [ ] Dark mode toggle
- [ ] Print receipt option
- [ ] Session extension for visitors (pay for more hours)

### Advanced Features
- [ ] Monthly parking passes
- [ ] Reserved spots for specific staff
- [ ] Integration with clinic scheduling system
- [ ] Automated overflow spot suggestions

---

## 🔒 Security Considerations (ALREADY IMPLEMENTED)

✅ **Input Validation:**
- Frontend: Real-time sanitization
- Backend: Zod schema validation with regex
- Prevents: SQL injection, XSS, invalid data

✅ **Authentication:**
- Supabase auth for admin access
- Role-based access control (admin vs. user)
- Session-based authentication

✅ **Payment Security:**
- Stripe handles all payment data (PCI compliant)
- No credit card data stored locally
- Webhook signature verification

✅ **API Security:**
- Rate limiting (should be added at deployment level)
- CORS configured for production domain
- Environment variables for secrets

---

## 📞 Support Information

**Admin Login:**
URL: `https://your-domain.com/admin/active`
(Bookmark this - no public link)

**Nevada PT Code:**
Current: `NVPT2025`
To change: Update database config table

**Stripe Dashboard:**
View payments: https://dashboard.stripe.com/payments
View webhooks: https://dashboard.stripe.com/webhooks

**Database Access:**
```bash
npx prisma studio  # Local development
```

**Useful Commands:**
```bash
npm run db:update-pricing  # Fix pricing to $2/hour
npm run db:check          # Check database connection
npm run admin:add         # Add new admin user
npm run db:seed           # Reset to default config
```

---

## 🐛 Troubleshooting

### Stripe shows wrong price
**Problem:** Stripe checkout shows $5 instead of $2/hour
**Solution:** Run `npm run db:update-pricing`

### Admin page not requiring login
**Problem:** Admin dashboard accessible without authentication
**Solution:** Check Supabase environment variables are set correctly

### QR codes not working
**Problem:** Scanning QR code doesn't pre-fill spot
**Solution:** Verify QR code URL format: `https://your-domain.com/checkin/A1`

### Nevada PT code not working
**Problem:** Code verification failing
**Solution:** Check database config table has correct code (case-insensitive)

### Webhook not receiving events
**Problem:** Stripe checkout completes but no session created
**Solution:**
1. Verify webhook endpoint in Stripe dashboard
2. Check `STRIPE_WEBHOOK_SECRET` is set
3. Check webhook logs in Stripe dashboard

---

## 📅 Maintenance Schedule

**Daily:**
- Monitor active sessions in admin dashboard
- Check for expired sessions

**Weekly:**
- Review Stripe payment logs
- Check for any failed payments
- Monitor database size

**Monthly:**
- Update Nevada PT code (if rotating)
- Review and clean up old sessions
- Check Stripe webhook logs for errors
- Update admin user list if staff changes

**As Needed:**
- Add/remove admin users
- Update pricing (if rates change)
- Generate new QR codes (if spots change)
