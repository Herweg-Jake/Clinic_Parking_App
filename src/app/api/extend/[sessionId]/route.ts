import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Generate a secure token for extending sessions
export function generateExtensionToken(sessionId: string): string {
  const secret = process.env.EXTENSION_TOKEN_SECRET || 'default-secret-change-in-production';
  const hash = crypto
    .createHmac('sha256', secret)
    .update(sessionId)
    .digest('hex');
  return hash.slice(0, 16);
}

// Verify the extension token
function verifyExtensionToken(sessionId: string, token: string): boolean {
  const expectedToken = generateExtensionToken(sessionId);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Verify token
    if (!verifyExtensionToken(sessionId, token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Get session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        spot: true,
        vehicle: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only allow extending paid sessions that haven't expired yet or just expired (within 30 min)
    if (session.status !== 'paid') {
      return NextResponse.json({ error: 'Can only extend paid sessions' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = session.expiresAt;
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    if (expiresAt && expiresAt < thirtyMinutesAgo) {
      return NextResponse.json({ error: 'Session expired too long ago' }, { status: 400 });
    }

    // Return HTML page for extension
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Extend Parking Time</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      margin-top: 0;
      color: #333;
    }
    .info {
      margin: 16px 0;
      padding: 12px;
      background: #f0f0f0;
      border-radius: 4px;
    }
    .info strong {
      display: block;
      margin-bottom: 4px;
    }
    label {
      display: block;
      margin: 16px 0 8px;
      font-weight: 500;
    }
    select, input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      box-sizing: border-box;
    }
    .price {
      margin: 16px 0;
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    button {
      width: 100%;
      padding: 16px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 16px;
    }
    button:hover {
      background: #1d4ed8;
    }
    button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    .success {
      color: #16a34a;
      padding: 12px;
      background: #dcfce7;
      border-radius: 4px;
      margin: 16px 0;
    }
    .error {
      color: #dc2626;
      padding: 12px;
      background: #fee2e2;
      border-radius: 4px;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Extend Parking Time</h1>
    <div class="info">
      <strong>Spot:</strong> ${session.spot.name}
      <strong>License Plate:</strong> ${session.vehicle.plate}
      <strong>Current Expiration:</strong> ${expiresAt ? new Date(expiresAt).toLocaleString() : 'N/A'}
    </div>

    <form id="extensionForm">
      <label for="hours">Extend by (hours):</label>
      <select id="hours" name="hours" required>
        <option value="1">1 hour</option>
        <option value="2">2 hours</option>
        <option value="3">3 hours</option>
        <option value="4">4 hours</option>
        <option value="6">6 hours</option>
        <option value="8">8 hours</option>
        <option value="12">12 hours</option>
      </select>

      <div class="price" id="priceDisplay">$2.00</div>

      <button type="submit" id="submitBtn">Extend & Pay</button>
    </form>

    <div id="message"></div>
  </div>

  <script>
    const hoursSelect = document.getElementById('hours');
    const priceDisplay = document.getElementById('priceDisplay');
    const form = document.getElementById('extensionForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');

    // Get current day of week (0 = Sunday, 5 = Friday, 6 = Saturday)
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const ratePerHour = isWeekend ? 4 : 2;

    // Update price when hours change
    hoursSelect.addEventListener('change', () => {
      const hours = parseInt(hoursSelect.value);
      const price = (ratePerHour * hours).toFixed(2);
      priceDisplay.textContent = '$' + price;
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      messageDiv.innerHTML = '';

      const hours = parseInt(hoursSelect.value);

      try {
        const response = await fetch(window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hours })
        });

        const data = await response.json();

        if (response.ok && data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          messageDiv.innerHTML = '<div class="error">' + (data.error || 'Failed to create checkout') + '</div>';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Extend & Pay';
        }
      } catch (error) {
        messageDiv.innerHTML = '<div class="error">An error occurred. Please try again.</div>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Extend & Pay';
      }
    });
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error in extend GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const token = request.nextUrl.searchParams.get('token');
    const { hours } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Verify token
    if (!verifyExtensionToken(sessionId, token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    if (!hours || hours < 1 || hours > 12) {
      return NextResponse.json({ error: 'Invalid hours' }, { status: 400 });
    }

    // Get session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        spot: true,
        vehicle: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'paid') {
      return NextResponse.json({ error: 'Can only extend paid sessions' }, { status: 400 });
    }

    // Check Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Payment processing not configured' }, { status: 500 });
    }

    const stripe = require('stripe')(stripeSecretKey);

    // Calculate price based on day of week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Sunday, Friday, Saturday
    const ratePerHour = isWeekend ? 400 : 200; // $4 or $2 in cents
    const amount = ratePerHour * hours;

    // Create Stripe checkout session for extension
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Parking Extension - Spot ${session.spot.name}`,
              description: `Extend parking for ${hours} hour(s)`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/extend/${sessionId}?token=${token}`,
      metadata: {
        type: 'extension',
        sessionId: sessionId,
        hours: hours.toString(),
      },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error('Error in extend POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
