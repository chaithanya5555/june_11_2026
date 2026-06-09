# SnapAlign Payment Testing Guide

## Prerequisites
- Razorpay Test Keys are configured:
  - Key ID: `rzp_test_SzLmBkN29N9fMr`
  - Key Secret: `tpU4YCo31eT5ji5Zq56eUbwN`

## Step-by-Step Payment Flow Testing

### Step 1: Sign In
1. Go to the website homepage
2. Click **"Sign In"** button (top right)
3. You'll be redirected to Emergent Auth
4. Click **"Continue with Google"** and complete authentication
5. You'll be redirected back to the dashboard

### Step 2: Add Products to Cart
1. Go to **Shop** page (`/shop`)
2. Browse products or filter by brand (Apple, Samsung, etc.)
3. Click **"Quick Add"** on any product
4. You should see a toast notification "Added to cart"
5. The cart icon in the navbar should show item count

### Step 3: View Cart
1. Click the cart icon in the navbar
2. Verify products are listed with:
   - Product image
   - Name and price
   - Quantity controls (+/-)
   - Remove button
3. Check the subtotal is calculated correctly

### Step 4: Proceed to Checkout
1. Click **"Checkout"** or **"Proceed to Checkout"**
2. Fill in shipping details:
   - **Name**: Test User
   - **Email**: test@example.com
   - **Phone**: 9876543210
   - **Address**: 123 Test Street
   - **City**: Mumbai
   - **State**: Maharashtra
   - **Pincode**: 400001

### Step 5: Complete Payment (Razorpay Test Mode)
1. Click **"Pay Now"** or **"Place Order"**
2. Razorpay checkout modal will open
3. Use these **TEST CARD DETAILS**:
   - **Card Number**: `4111 1111 1111 1111`
   - **Expiry**: Any future date (e.g., `12/28`)
   - **CVV**: Any 3 digits (e.g., `123`)
   - **Name**: Test User
4. Complete the payment
5. You should be redirected to order confirmation page

### Step 6: Verify Order in Admin
1. Go to Admin Dashboard (`/admin`)
2. Login with password: `snapalign2026` (leave email blank)
3. Click **"Orders"** tab
4. Verify the new order appears with:
   - Order ID
   - Customer details
   - Order items
   - Payment status: "Paid"

## Alternative: UPI Payment Testing
The app also supports UPI payments:
1. At checkout, select **"Pay via UPI"**
2. Scan the QR code or use the UPI ID
3. Enter the UTR number after payment
4. Admin will verify the payment in the "Pending Payments" tab

## Troubleshooting
- If payment modal doesn't open: Check browser console for errors
- If order not created: Check backend logs with `tail -f /var/log/supervisor/backend.err.log`
- If cart is empty after login: Try adding products again

## Test Card Numbers (Razorpay Test Mode)
| Card Type | Number | CVV |
|-----------|--------|-----|
| Visa | 4111 1111 1111 1111 | Any 3 digits |
| Mastercard | 5267 3181 8797 5449 | Any 3 digits |
| Failed Payment | 4000 0000 0000 0002 | Any 3 digits |

