# Snap Aligner - Ecommerce Platform PRD

## Architecture
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn
- Auth: Emergent Google OAuth (customers) + Password (admin)
- Payments: Razorpay SDK (multi-gateway: UPI, Cards, Wallets, Pay Later)
- Design: Dark mode, #000000 bg, #007AFF accent, Outfit + DM Sans

## What's Implemented (March 2026)
### Store
- 15 products in 4 categories (INR pricing with compare-at)
- 3-column grid, trust badges, Quick Add, sidebar hamburger nav
- WhatsApp float, search, filters, reviews, wishlist
### Payments (Multi-Gateway)
- PhonePe, Google Pay, Paytm, MobiKwik, Razorpay selector
- Demo mode (simulated) + real Razorpay integration ready
- Post-payment: auto stock deduction, settlement calc (2% fee), order confirmation
- Trust footer with 8 payment partner logos
### Admin Dashboard
- Password-protected, 5 tabs: Orders, Products, Warehouse, Dead Stock, Settings
- Sales Intelligence: Revenue, Net Profit, Projected Revenue (after fees)
- Order management with tracking numbers, CSV export
- Warehouse: stock status (green/yellow/red), bin locations
- Dead Stock: 30-day zero-sales detection
- Settings: GUI to change Razorpay keys + admin password
### Order Tracking
- Public /track route with progress bar and tracking number display

## Collections
users, user_sessions, admin_sessions, products, cart_items, orders, wishlists, reviews, payment_transactions, settlements

## Backlog
- P1: Real Razorpay keys integration
- P1: WhatsApp order notifications
- P2: Product variants (model/color)
- P2: Coupon/promo codes
- P2: Analytics charts in admin
