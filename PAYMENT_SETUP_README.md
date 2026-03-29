# Snap Aligner - Payment Gateway Setup Guide

## Quick Start (Demo Mode)
The platform ships in **Demo Mode** - all payments are simulated so you can test the full checkout flow without real API keys. No money is charged.

---

## Setting Up Real Razorpay Keys

### Step 1: Create Razorpay Account
1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Sign up with your email (no GSTIN required for test mode)
3. Complete basic verification

### Step 2: Get Test API Keys
1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings** > **API Keys**
3. Select **Test Mode** (toggle at top)
4. Click **Generate Test Key**
5. You'll get:
   - **Key ID**: `rzp_test_xxxxxxxxxxxx`
   - **Key Secret**: `xxxxxxxxxxxxxxxx` (shown only once - copy it!)

### Step 3: Add Keys via Admin Dashboard (Recommended)
1. Go to your site: `yoursite.com/admin`
2. Login with admin password (default: `snapalign2026`)
3. Click the **Settings** tab
4. Paste your **Razorpay Key ID** and **Key Secret**
5. Click **Save Settings**
6. The dashboard will switch from "Demo Mode" to "Live Mode"

### Step 3 (Alternative): Edit .env File Directly
If you prefer, edit `/app/backend/.env`:
```
RAZORPAY_KEY_ID=rzp_test_your_actual_key
RAZORPAY_KEY_SECRET=your_actual_secret
```
Then restart the backend: `sudo supervisorctl restart backend`

---

## Payment Methods Available

| Method | Provider | Description |
|--------|----------|-------------|
| PhonePe | UPI Intent | Direct PhonePe app payment |
| Google Pay | UPI Intent | Direct GPay app payment |
| Paytm | Wallet & UPI | Paytm wallet or UPI |
| MobiKwik | Wallet & ZIP | MobiKwik wallet + ZIP Pay Later |
| Razorpay | Cards & Netbanking | All cards (Visa/MC/RuPay) + All banks |

> **Note**: PhonePe, GPay, Paytm, and MobiKwik all route through Razorpay's SDK using "Direct Intent" mode. You only need ONE set of Razorpay API keys.

---

## Going Live (Production Keys)

### Step 1: Complete Razorpay KYC
1. In Razorpay Dashboard, go to **Account & Settings** > **Profile**
2. Complete business verification (PAN, bank account)
3. Submit for review (takes 1-3 business days)

### Step 2: Generate Live Keys
1. Toggle to **Live Mode** in Razorpay Dashboard
2. Go to **Settings** > **API Keys** > **Generate Live Key**
3. You'll get:
   - **Key ID**: `rzp_live_xxxxxxxxxxxx`
   - **Key Secret**: `xxxxxxxxxxxxxxxx`

### Step 3: Update Keys
- Use the Admin Dashboard > Settings tab to update keys
- OR edit `/app/backend/.env` and restart

---

## Post-Payment Automation

When a payment succeeds, the following happens automatically:
1. **Order Status** → Updated to "Confirmed" in Admin Dashboard
2. **Warehouse Stock** → Deducted for each item purchased
3. **Settlement Calculation** → Transaction amount minus 2% gateway fee
4. **Projected Revenue** → Displayed in Admin Dashboard stats

---

## Test Card Numbers (Razorpay Test Mode)

| Card Type | Number | Expiry | CVV |
|-----------|--------|--------|-----|
| Visa (Success) | 4111 1111 1111 1111 | Any future | Any 3 digits |
| Mastercard | 5267 3181 8797 5449 | Any future | Any 3 digits |
| RuPay | 6073 849700 0017 64 | Any future | Any 3 digits |

### Test UPI ID
- `success@razorpay` (for successful payment)
- `failure@razorpay` (for failed payment)

### Test Wallet
- OTP: `1234` (works for all wallets in test mode)

---

## Changing Admin Password

### Via Admin Dashboard:
1. Go to `/admin` > **Settings** tab
2. Enter new password in "Admin Password" field
3. Click **Save Settings**

### Via .env File:
Edit `/app/backend/.env`:
```
ADMIN_PASSWORD=your_new_password
```
Then restart: `sudo supervisorctl restart backend`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Demo Mode" won't switch off | Ensure Key ID starts with `rzp_test_` (not `rzp_test_DEMO`) |
| Payment fails | Check Razorpay Dashboard > Payments for error details |
| Keys not saving | Try editing `.env` file directly and restarting backend |
| MobiKwik ZIP not showing | ZIP Pay Later requires Razorpay activation. Contact Razorpay support |

---

## File Locations
- Backend config: `/app/backend/.env`
- Backend server: `/app/backend/server.py`
- Frontend checkout: `/app/frontend/src/pages/Checkout.js`
- Admin dashboard: `/app/frontend/src/pages/AdminDashboard.js`
