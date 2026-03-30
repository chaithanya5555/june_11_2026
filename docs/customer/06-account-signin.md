# How to Sign In & Manage Your Account

## Overview
Sign in with Google to access cart, checkout, orders, wishlist, and reviews.

---

## Signing In

### Method 1: Navbar Sign In Button
1. Click the blue **Sign In** button in the top-right navbar
2. You're redirected to Google's login page
3. Select your Google account or enter your email/password
4. After authentication, you're redirected back to the store
5. Your profile picture appears in the navbar

### Method 2: Sidebar Menu
1. Click hamburger menu (☰)
2. Click the blue **Sign In with Google** button at the bottom
3. Same Google login flow

### Method 3: Prompted During Action
- When you try to add to cart, add to wishlist, or checkout without being signed in
- You'll be automatically redirected to Google login
- After login, you're returned to the store

---

## Viewing Your Profile

### Step 1: Open Profile
Three ways:
1. Click your **profile picture** in the navbar
2. Click hamburger (☰) → **My Orders**
3. Go directly to: `https://your-site.com/profile`

### Step 2: What You'll See
- **Your photo and name** (from Google)
- **Email address**
- **Sign Out** button
- **My Orders** section with all your past orders

---

## Viewing Order History

### On the Profile Page
1. Each order shows:
   - **Order ID** (e.g., ORD-A1B2C3D4)
   - **Date** ordered
   - **Status badge**: Pending / Confirmed / Shipped / Delivered / Cancelled
   - **Items list** with images, names, quantities, prices
   - **Total amount** (₹)
   - **Tracking number** (if available, shown in blue)

### No Orders?
- Message: "No orders yet"
- Click **Start Shopping** to begin

---

## Signing Out

### Method 1: Profile Page
1. Go to Profile
2. Click **Sign Out** button (top-right)

### Method 2: Sidebar Menu
1. Click hamburger (☰)
2. Scroll down to your profile section
3. Click **Sign Out** (red text)

### Method 3: Navbar Dropdown
1. Hover over your profile picture in navbar
2. Click **Sign Out** from the dropdown

### After Signing Out
- You're returned to the homepage
- Cart is cleared (server-side)
- Wishlist is preserved for next login
- You can still browse products but can't purchase

---

## Account Details

| Detail | Source | Editable? |
|--------|--------|-----------|
| Name | Google Account | No (change in Google) |
| Email | Google Account | No (change in Google) |
| Photo | Google Account | No (change in Google) |
| Role | System assigned | No (admin sets this) |

---

## First User = Admin
The very first person to sign in with Google gets **admin role** automatically. All subsequent users are regular customers.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Google login not working | Check internet, try a different browser |
| Stuck on "Signing you in..." | Wait 5 seconds, if stuck, go back to homepage and try again |
| Profile photo not showing | Google may not have a profile photo set |
| Can't see admin panel | Only the first user gets admin role |

---

## Time Required
- Sign in: ~10 seconds
- View profile: ~2 seconds
- Sign out: ~3 seconds
