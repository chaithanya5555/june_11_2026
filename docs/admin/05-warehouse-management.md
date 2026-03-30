# How to Use Warehouse Management

## Overview
Monitor stock levels, identify low/critical stock items, manage bin locations, and track dead stock — all from the Admin Dashboard.

---

## Accessing Warehouse Tab

### Step 1: Open Admin Dashboard
1. Open browser → `https://your-site.com/admin`
2. Enter admin password → Click **Login**

### Step 2: Click Warehouse Tab
1. Click **Warehouse** in the tab bar
2. You'll see a table sorted by stock level (lowest first)

---

## Understanding Stock Status Labels

| Label | Color | Meaning | Action Required |
|-------|-------|---------|-----------------|
| **IN STOCK** | 🟢 Green | More than 20 units | No action needed |
| **LOW** | 🟡 Yellow | 5 to 20 units | Plan to reorder soon |
| **CRITICAL** | 🔴 Red | Less than 5 units | Reorder immediately |

---

## Critical Stock Alerts

When any product drops below 5 units:
1. A **red alert banner** appears at the TOP of the dashboard (visible on ALL tabs)
2. Banner says: "CRITICAL STOCK ALERT"
3. Lists all critical items with their remaining count
4. Example: `Leather Executive Wallet Case (3 left)`

### What to Do
1. Note the products listed in the alert
2. Contact your supplier to reorder
3. Once new stock arrives:
   - Go to **Products** tab
   - Click edit (✏️) on the product
   - Update the **Stock** number
   - Click **Update**
4. The alert disappears when stock goes above 5

---

## Warehouse Table Columns

| Column | Description |
|--------|-------------|
| **Product** | Product name |
| **Stock Status** | Color-coded label (IN STOCK / LOW / CRITICAL) |
| **Qty** | Exact number of units available |
| **Bin Location** | Physical location in your warehouse |

---

## Managing Bin Locations

### What is a Bin Location?
A bin location tells your packing team exactly where to find a product in the warehouse.

Format example: `Shelf B, Bin 4` or `Rack 3, Row 2, Slot 5`

### How to Set/Change Bin Location
1. Go to **Products** tab
2. Click edit (✏️) on the product
3. Enter the bin location in the **Bin Location** field
4. Click **Update**
5. New location shows in Warehouse tab

### Suggested Bin Location Format
```
Shelf [A-Z], Bin [1-99]
```
Examples:
- `Shelf A, Bin 1` — Tempered Glass section
- `Shelf B, Bin 1` — Cases section
- `Shelf C, Bin 1` — Holders section
- `Shelf D, Bin 1` — Cables & Chargers section

---

## Dead Stock Tracker

### What is Dead Stock?
Products that have had **zero sales in the last 30 days**. These are tying up capital and warehouse space.

### How to Check
1. Click the **Dead Stock** tab
2. Products with no sales in 30 days are listed
3. Each shows: name, category, stock count, bin location

### What to Do with Dead Stock
1. **Run a sale**: Reduce price and set Compare At price to show discount
2. **Bundle it**: Combine with popular items as a combo deal
3. **Remove it**: If it's truly unsellable, delete the product
4. **Move it**: Relocate to a less accessible bin to free prime shelf space

---

## Automatic Stock Deduction

When a customer completes payment:
1. Stock is **automatically deducted** for each item in the order
2. If 2 units of "iPhone Case" were ordered, stock reduces by 2
3. If stock was 10, it becomes 8
4. If stock reaches critical level (<5), the alert banner appears

You do NOT need to manually update stock after orders.

---

## Stock Monitoring Routine

### Daily Checklist
- [ ] Check the Critical Stock Alert banner on dashboard
- [ ] Review the Warehouse tab for any LOW items
- [ ] Reorder critical items

### Weekly Checklist
- [ ] Review Dead Stock tab
- [ ] Plan promotions for slow-moving products
- [ ] Verify bin locations match physical warehouse

---

## Time Required
- Daily stock check: ~2 minutes
- Weekly review: ~10 minutes
