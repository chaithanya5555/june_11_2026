# How to Add to Cart, Manage Cart & Checkout

## Overview
Complete guide from adding your first item to completing payment.

---

## Part 1: Adding Items to Cart

### Method 1: Quick Add (from Shop page)
1. Browse products on the Shop page
2. Hover over any product card
3. The **Quick Add** button appears at the bottom of the card
4. Click **Quick Add**
5. Toast notification: "Added to cart"
6. Cart badge updates in the navbar

### Method 2: From Product Detail Page
1. Open any product
2. Choose quantity using **+** and **-** buttons (default: 1)
3. Click the blue **Add to Cart** button
4. Toast notification: "Added X item(s) to cart"

### Not Logged In?
- If you're not signed in, clicking Add to Cart will redirect you to Google login
- After signing in, return to the product and add again

---

## Part 2: Viewing Your Cart

### Open Cart
1. Click the **shopping bag icon** (🛍️) in the top-right navbar
2. Cart slides in from the right side

### Cart Shows
- Each item with:
  - Product image (small thumbnail)
  - Product name
  - Price per unit (₹)
  - Quantity with +/- controls
  - Remove button (trash icon)
- **Subtotal** at the bottom
- **Checkout** button

---

## Part 3: Managing Cart Items

### Change Quantity
1. Open the cart (click bag icon)
2. Find the item
3. Click **+** to increase quantity
4. Click **-** to decrease quantity
5. If quantity reaches 0, item is removed

### Remove an Item
1. Open the cart
2. Click the **trash icon** (🗑️) next to the item
3. Item is removed immediately

### Cart is Empty?
- If cart is empty, you'll see "Your cart is empty"
- Click **Start Shopping** to go to the shop page

---

## Part 4: Checkout Process

### Step 1: Go to Checkout
1. Open your cart
2. Click the blue **Checkout** button
3. Checkout page loads

### Step 2: Review Order Summary
Right side shows:
- All items with quantities and prices
- **Subtotal** — Total before shipping
- **Shipping** — Free if ₹500+ / ₹49 otherwise
- **Total** — Final amount to pay

### Step 3: Select Payment Method
Left side shows 5 payment options:
| # | Method | Description |
|---|--------|-------------|
| 1 | **PhonePe** | UPI payment via PhonePe app |
| 2 | **Google Pay** | UPI payment via GPay app |
| 3 | **Paytm** | Wallet or UPI via Paytm |
| 4 | **MobiKwik** | Wallet + ZIP Pay Later |
| 5 | **Razorpay** | All credit/debit cards & netbanking |

1. Click on your preferred method
2. Blue radio button fills to confirm selection
3. UPI methods are highlighted with a "UPI" badge

### Step 4: Complete Payment
1. Click the blue **Pay ₹[amount]** button
2. What happens next depends on the mode:

**Demo Mode** (default):
- Shows toast: "Demo Mode: Simulating payment..."
- After 1.5 seconds, payment auto-completes
- Redirected to success page

**Live Mode** (real Razorpay keys):
- Razorpay payment modal opens
- Enter payment details:
  - **UPI**: Enter UPI ID or scan QR
  - **Card**: Enter card number, expiry, CVV
  - **Netbanking**: Select your bank
  - **Wallet**: Select wallet, enter OTP
- Complete the payment in the modal
- Redirected to success page

### Step 5: Payment Confirmation
1. Success page shows:
   - ✅ "Payment Successful!" heading
   - Order ID (e.g., ORD-A1B2C3D4)
   - Confirmation of automated actions:
     - Order confirmed
     - Stock deducted
     - Settlement calculated
2. Options:
   - **View My Orders** — See all your orders
   - **Track Order** — Track this order
   - **Continue Shopping** — Back to store

---

## Trust Footer
At the bottom of checkout, you'll see trust badges for:
PhonePe | GPay | Paytm | MobiKwik | Razorpay | Visa | Mastercard | RuPay

This confirms all major payment methods are supported.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cart is empty" on checkout | Add items to cart first from the shop |
| "Not authenticated" error | You need to sign in first (click Sign In) |
| Payment cancelled | Click Pay again, complete the payment |
| Payment failed | Check your payment details, try another method |
| Stuck on "Processing..." | Wait 30 seconds, if still stuck, refresh and check orders |

---

## Time Required
- Add to cart: ~5 seconds
- Checkout: ~1-2 minutes
