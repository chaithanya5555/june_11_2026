# How to Set Up & Manage Payment Gateway Keys

## Overview
Manage your Razorpay API keys directly from the Admin Dashboard GUI. Switch between Demo Mode and Live Mode without touching any code.

---

## Understanding Modes

| Mode | Key Prefix | What Happens |
|------|-----------|--------------|
| **Demo Mode** | `rzp_test_DEMO...` | Payments are simulated. No real money is charged. Good for testing. |
| **Test Mode** | `rzp_test_...` | Uses Razorpay sandbox. No real money. Full payment UI. |
| **Live Mode** | `rzp_live_...` | Real payments. Real money. Production use. |

---

## Step 1: Get Razorpay Keys

### If You Don't Have a Razorpay Account
1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Click **Sign Up**
3. Enter your email, phone, business name
4. **GSTIN is NOT required** for test mode
5. Verify your email

### Generate Test Keys
1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Make sure **Test Mode** is toggled ON (top of dashboard)
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key**
5. **IMPORTANT**: Copy both values immediately!
   - **Key ID**: `rzp_test_xxxxxxxxxxxx`
   - **Key Secret**: `xxxxxxxxxxxxxxxx` (shown only once!)

---

## Step 2: Add Keys via Admin Dashboard

### Open Settings
1. Go to: `https://your-site.com/admin`
2. Login with admin password
3. Click the **Settings** tab (last tab with gear icon ⚙️)

### Enter Keys
1. You'll see:
   - Current mode indicator (Demo Mode / Live Mode)
   - **Razorpay Key ID** field (pre-filled with current key)
   - **Razorpay Key Secret** field (shows masked version)
2. Replace the **Key ID** with your real test key
   - Example: `rzp_test_1DP5mmOlF5G5ag`
3. Enter your **Key Secret** in the secret field
   - Example: `dF3nQ8k2Lm9pO7rT5vX1`
4. Click the blue **Save Settings** button

### Verify
- Success toast: "Updated: razorpay_key_id, razorpay_key_secret"
- The mode indicator should change from "Demo Mode" to "Live Mode"
- Your store is now connected to Razorpay sandbox

---

## Step 3: Test a Payment
1. Open store in a new tab
2. Add a product to cart
3. Go to Checkout
4. Select any payment method (PhonePe, GPay, etc.)
5. Click **Pay**
6. Razorpay payment modal should open
7. Use test credentials:
   - **Test UPI**: `success@razorpay`
   - **Test Card**: `4111 1111 1111 1111`, any future expiry, any 3-digit CVV
   - **Test Wallet OTP**: `1234`

---

## Going Live (Production)

### Prerequisites
1. Complete Razorpay KYC:
   - PAN card verification
   - Bank account verification
   - Business details
   - Takes 1-3 business days
2. Razorpay approves your account

### Generate Live Keys
1. Toggle to **Live Mode** in Razorpay Dashboard
2. Go to **Settings** → **API Keys**
3. Click **Generate Live Key**
4. Copy both values

### Update in Admin
1. Go to Admin → Settings tab
2. Replace Key ID with `rzp_live_...` key
3. Enter the live secret
4. Click **Save Settings**
5. Mode changes to "Live Mode"
6. **Real payments are now active!**

---

## Changing Admin Password

### From Settings Tab
1. Go to Admin → Settings tab
2. Scroll down to **Admin Password** section
3. Enter your new password
4. Click **Save Settings**
5. Next login will require the new password

### Important
- Remember your new password!
- If you forget it, you'll need to edit the `/app/backend/.env` file directly

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Still shows "Demo Mode" after adding keys | Make sure Key ID does NOT start with `rzp_test_DEMO` |
| "Failed to save" error | Check you're logged into admin, try refreshing |
| Payment modal not opening | Verify Key ID is correct, check browser console for errors |
| "Invalid key" error on payment | Key ID and Secret must be from the same Razorpay account |
| Need to revert to Demo | Set Key ID back to `rzp_test_DEMO_MODE` |

---

## Security Notes
- Key Secret is masked in the UI (only first 8 characters shown)
- Keys are stored in the server's `.env` file
- Never share your Key Secret publicly
- Use test keys for development, live keys only for production
- You can regenerate keys anytime from Razorpay Dashboard

---

## Time Required
- First setup: ~10 minutes (including Razorpay signup)
- Key change: ~1 minute
