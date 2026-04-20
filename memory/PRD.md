# SnapAlign - E-commerce Platform PRD

## Architecture
- **Backend**: FastAPI + MongoDB (motor async)
- **Frontend**: React + Tailwind + Shadcn + Phosphor Icons
- **Auth**: Emergent Google OAuth (customers) + password-based admin (owner / warehouse_manager RBAC)
- **Payments**: Razorpay SDK (DEMO_MODE active) + Manual UPI with QR + UTR submission/verification
- **Design**: Dark (`#000000` bg, `#007AFF` accent), Outfit + DM Sans

## Directory Layout
```
/app/
├── backend/
│   ├── server.py          (all routes/models — 1370 LOC, refactor candidate)
│   ├── seed_products.py   (idempotent after first run)
│   ├── tests/test_variants.py  (17 tests, all pass)
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/         (Home, Shop, ProductDetail, Checkout, AdminDashboard, etc.)
│   │   ├── components/
│   │   │   ├── admin/VariantsEditor.js  (flexible axes+variants CRUD)
│   │   │   └── ... (Navbar, CartSheet, ProductCard, ui/)
│   │   └── contexts/      (AuthContext, CartContext — variant-aware)
│   └── .env
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

## Key Data Models
- **products**: `{product_id, name, price, stock, category, image, images[], video, warranty, variant_axes[], variants[]}`
- **variant_axes**: customizable `[{key, label, ui: 'dropdown'|'swatch'|'buttons', depends_on}]`
- **variants**: concrete SKUs `[{variant_id, options: {axisKey: value}, stock, price_modifier, image?, swatch_hex?}]`
- **orders**: `{order_id, user_id, items[{product_id, variant_id?}], total, status, payment_method, ...}`
- **cart_items**: `{cart_item_id, user_id, product_id, variant_id, quantity}`
- **admin_users**: `{admin_user_id, email, password_hash, role}`

## Implemented Features (as of Feb 2026)

### Core Store
- 15+ seeded products, 4 categories (Tempered Glass, Cases, Holders, Cables & Chargers)
- Shop grid, filters, search, product detail, reviews, wishlist
- Cart sheet + mobile-optimised checkout (items on top → summary → payment on mobile)
- Public order tracking `/track/{order_id}`

### Variants (Feb 2026 — NEW, flexible + customizable)
- **Two-level cascading dropdowns** for tempered glass (Brand → Model). Admin fully customizes brand list + model list. Model dropdown disabled until brand chosen; values filter based on parent.
- **Color swatches** for phone cases with per-color image + optional hex. Clicking a swatch jumps main carousel to that variant's image.
- **`variant_axes` schema** supports ANY future axis (Size, Storage, Material, …) with `dropdown` / `swatch` / `buttons` UI.
- Admin **VariantsEditor** with 3 quick-start presets + add-axis / add-variant / reorder / remove / swatch hex picker.
- Per-variant `stock` and `price_modifier` (e.g. red case +₹100).
- Price auto-updates on Product Detail when variant selected; "Add to Cart" gated until all axes chosen.
- Cart and Checkout display the variant label beneath the product name and use the variant image as thumbnail.
- Backward-compatible: legacy `{type, value}` flat variants still render (no regression).

### Payments
- Razorpay (demo mode) — UPI, cards, wallets, pay-later
- Manual UPI flow: QR code + customer submits UTR → admin approves/rejects
- 2% fee calculation, settlement records, auto stock deduct, cart clearance on paid

### Admin Dashboard
- RBAC: owner vs warehouse_manager
- Tabs: Pending Payments (UTR), Orders, Products, Warehouse, Dead Stock, Coupons, Analytics, Team, Settings
- Product modal now includes **flexible VariantsEditor** (axes + variants)
- Dynamic product warranty, image gallery (carousel), demo video (autoplay on video slide)
- CSV export, critical stock alert, bin locations
- Analytics: revenue trend, category revenue, status pie, top products
- Settings: Razorpay keys, admin password, WhatsApp number, UPI ID/QR/name — stored in env + db

### Cart Endpoints (variant-aware)
- `POST /api/cart` — creates new line per `(product_id, variant_id)` tuple
- `GET /api/cart` — enriches each row with `variant` object (image, price_modifier, options)
- `PUT /api/cart/item/{cart_item_id}` — update qty by cart line id (variant-safe)
- `DELETE /api/cart/item/{cart_item_id}` — remove specific variant line
- Legacy `PUT/DELETE /api/cart/{product_id}` still present (back-compat) — should be deprecated once FE fully migrated.

## Testing
- `/app/backend/tests/test_variants.py` — 17 tests covering variant CRUD, cart variant-awareness, legacy regression, auth gates, full variant checkout subtotal.
- All pass. Report: `/app/test_reports/iteration_4.json`.

## Credentials
- Admin legacy login: password `snapalign2026` (leave email blank) — `/app/memory/test_credentials.md`

## Backlog (P0 → P3)

### 🟡 P1 — Ready to build (no blockers)
- **Shareable Instagram coupon deep-links** `/offer/<CODE>?product=<id>` → auto-apply coupon + redirect to checkout.
- **Bulk CSV product upload** — spec already drafted with user.

### 🟠 P2 — Backlog (some need user input)
- **GST-compliant PDF invoice + Zoho SMTP auto-emailer** — BLOCKED on Zoho SMTP password + GST details from user.
- **Admin "Send Invoice via WhatsApp"** on order row — BLOCKED on admin WhatsApp number.
- **Customer phone number field** at checkout (needed for WhatsApp share).
- **Address book** in user profile.
- Product **`hsn_code` + `gst_rate`** fields (required for invoice PDFs).
- Deprecate legacy `PUT/DELETE /api/cart/{product_id}` endpoints.

### 🔵 P3 — Future
- Razorpay **live mode** configuration.
- OTP via SMS / Email / Voice call.
- Refactor `/app/backend/server.py` into routers (auth, products, cart, payment, admin) — now 1370 LOC.

## Last Session Changelog (Feb 2026)
- Removed "Made with Emergent" badge + Posthog (`frontend/public/index.html`)
- Hid WhatsApp widget on `/admin` + `/checkout` (Navbar.js)
- Fixed admin header leaking customer profile (Navbar.js, AdminDashboard.js)
- Fixed CartSheet not closing on Checkout (CartSheet.js, sheet.jsx)
- Re-ordered mobile checkout: items → summary → payment (Checkout.js)
- Dynamic per-product warranty (replacing hardcoded "1 year")
- Product image carousel + autoplaying demo video
- Idempotent `/api/seed`
- **Feb 2026 — Flexible variant system** (this release):
  - `variant_axes` schema on product
  - Backend cart enrichment + variant-aware `/cart/item/{id}` endpoints
  - Frontend cascading dropdowns, color swatches with per-color images
  - Admin VariantsEditor component with presets, reorderable axes, per-variant stock/price/image/hex
  - Cart + Checkout show variant label and per-variant thumbnail
