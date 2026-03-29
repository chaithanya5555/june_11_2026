# SnapAlign - Ecommerce Platform PRD

## Problem Statement
Create an ecommerce platform for SnapAlign - a mobile accessories company. Full feature set with product catalog, cart, checkout, auth, orders, reviews, wishlist, and admin dashboard.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: Emergent-managed Google OAuth
- **Payments**: Stripe via emergentintegrations
- **Design**: Swiss & High-Contrast (Archetype 4), Light theme, Outfit + Manrope fonts, accent #FF5A00

## User Personas
1. **Customer**: Browse products, add to cart/wishlist, checkout, track orders, leave reviews
2. **Admin**: Manage products (CRUD), view/update orders, see revenue stats

## Core Requirements
- Product catalog with 7 categories and search/filter
- Shopping cart with quantity controls
- Stripe payment checkout
- Google social login
- Order history & tracking
- Product reviews & ratings
- Wishlist
- Admin dashboard with stats, order management, product CRUD

## What's Implemented (March 29, 2026)
- Full backend with 20+ API endpoints
- 15 seeded products across 7 categories
- Google OAuth via Emergent Auth (first user = admin)
- Stripe checkout integration
- Complete frontend: Home, Shop, Product Detail, Cart, Checkout, Profile, Wishlist, Admin Dashboard
- Responsive design with glassmorphism navbar
- Search, category filters, sort options

## Backlog
- P1: Product image gallery (multiple images per product)
- P1: Order email notifications
- P2: Product variants (color/size selection)
- P2: Coupon/discount codes
- P2: Inventory management alerts
- P3: Related products recommendations
- P3: Analytics dashboard with charts

## Collections
users, user_sessions, products, cart_items, orders, wishlists, reviews, payment_transactions
