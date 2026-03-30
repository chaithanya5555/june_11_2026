# How to Manage Orders

## Overview
View all customer orders, change their status, add tracking numbers, search orders, and export order data as CSV.

---

## Step-by-Step Instructions

### Step 1: Open Admin Dashboard
1. Open browser → `https://your-site.com/admin`
2. Enter admin password → Click **Login**

### Step 2: View Orders
1. The **Orders** tab is selected by default
2. You'll see a table with columns:
   - **Order ID**: Unique order reference (e.g., ORD-A1B2C3D4)
   - **Customer**: Customer name or email
   - **Total**: Order amount in ₹
   - **Method**: Payment method used (PhonePe, GPay, etc.)
   - **Status**: Current order status
   - **Tracking**: Tracking number field

---

## Order Status Workflow

| Status | Meaning | When to Use |
|--------|---------|-------------|
| `pending_payment` | Order placed, payment not confirmed | Auto-set on order creation |
| `confirmed` | Payment received | Auto-set after successful payment |
| `shipped` | Package dispatched | Set when you hand over to courier |
| `delivered` | Customer received package | Set when delivery is confirmed |
| `cancelled` | Order cancelled | Set for cancellations/refunds |

### How to Change Order Status
1. Find the order in the table
2. Click the **status dropdown** in the Status column
3. Select the new status (e.g., `confirmed` → `shipped`)
4. Status updates immediately
5. Success toast "Updated" appears
6. Customer can see updated status on the /track page

---

## Adding Tracking Numbers

### Step 1: Get Tracking Number
- From your courier partner (Delhivery, BlueDart, India Post, etc.)

### Step 2: Add to Order
1. Find the order in the table
2. In the **Tracking** column, type the tracking number in the input field
3. Click the blue **Save** button next to it
4. Success toast "Tracking saved" appears
5. Customer can see this tracking number on the /track page

---

## Searching Orders

1. At the top of the Orders tab, there's a **Search** input
2. Type any of:
   - Order ID (e.g., `ORD-A1B2`)
   - Customer name (e.g., `Rahul`)
3. The table filters in real-time
4. Clear the search field to show all orders again

---

## Exporting Orders as CSV

### When to Use
- Daily order export for dropshipping suppliers
- Monthly accounting/bookkeeping
- Sharing order data with fulfillment team

### How to Export
1. Click the **Export CSV** button (top-right of Orders tab)
2. A CSV file downloads automatically
3. File name format: `orders_20260329.csv`

### CSV Columns
| Column | Description |
|--------|-------------|
| Order ID | Unique order reference |
| Customer Name | Name from Google login |
| Customer Email | Email from Google login |
| Items | List of products and quantities |
| Total (INR) | Order total in rupees |
| Status | Current order status |
| Tracking Number | Courier tracking number |
| Payment Method | How customer paid |
| Date | Order creation date |

### Opening the CSV
- **Excel**: Double-click the file, or File → Open
- **Google Sheets**: Upload to Google Drive → Open with Google Sheets
- **Numbers (Mac)**: Double-click the file

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No orders showing | No customers have placed orders yet |
| Status not changing | Click the dropdown carefully, select the new status |
| Tracking save button not working | Make sure you typed something in the tracking field |
| CSV not downloading | Check browser's download settings, allow popups |

---

## Time Required
- View orders: Instant
- Change status: ~5 seconds per order
- Add tracking: ~10 seconds per order
- Export CSV: ~3 seconds
