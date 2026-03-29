# Snap Aligner - Ecommerce Platform PRD

## Problem Statement
Premium ecommerce platform for SnapAlign (snapalign.in) - mobile accessories for Indian market. Spigen-inspired dark mode design with warehouse intelligence and admin dashboard.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: Emergent Google OAuth (customers) + Password auth (admin)
- **Payments**: Stripe via emergentintegrations (INR)
- **Design**: Dark mode, #000000 bg, #007AFF electric blue accent, Outfit + DM Sans fonts

## User Personas
1. **Customer**: Browse products, add to cart/wishlist, checkout (INR), track orders, leave reviews
2. **Admin**: Manage products (CRUD with cost/bin), manage orders (tracking numbers), view sales intelligence, warehouse stock, dead stock, CSV export

## What's Implemented (March 29, 2026)
- Dark mode Spigen-style frontend with hamburger sidebar navigation
- 15 products across 4 categories: Tempered Glass, Cases, Holders, Cables & Chargers
- 3-column product grid with Quick Add, Compare At pricing, Trust badges
- Floating WhatsApp button for Indian customer support
- Password-protected admin dashboard (password: snapalign2026)
- Sales Intelligence: Revenue, Net Profit, Orders, Users
- Order Management with Tracking Number input
- Warehouse Intelligence: Stock status (Green/Yellow/Red), Bin Locations
- Dead Stock Tracker (30-day no-sales detection)
- Daily Order Export (CSV)
- Public /track route for customer order tracking
- INR (₹) currency throughout
- Google OAuth for customer login
- Stripe checkout (INR)
- Product reviews & ratings
- Wishlist functionality
- SEO optimized for snapalign.in

## Collections
users, user_sessions, admin_sessions, products, cart_items, orders, wishlists, reviews, payment_transactions

## Backlog
- P1: Product image gallery (multiple images)
- P1: Order email/WhatsApp notifications
- P2: Product variants (model/color)
- P2: Coupon/promo codes
- P2: Analytics charts in admin
- P3: Inventory reorder automation
- P3: Customer address management
