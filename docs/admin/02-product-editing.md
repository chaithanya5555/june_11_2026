# How to Edit an Existing Product

## Overview
Modify any product detail — price, stock, description, image, bin location — directly from the admin panel.

---

## Step-by-Step Instructions

### Step 1: Open Admin Dashboard
1. Open browser → `https://your-site.com/admin`
2. Enter admin password → Click **Login**

### Step 2: Go to Products Tab
1. Click the **Products** tab in the dashboard
2. Find the product you want to edit in the table

### Step 3: Click Edit Button
1. In the product row, look at the **Actions** column (last column)
2. Click the **pencil icon** (✏️) next to the product
3. An edit popup form will appear, pre-filled with the current product data

### Step 4: Modify Fields
- Change any field you need to update:
  - **Name**: Edit the product title
  - **Description**: Update the description text
  - **Price (₹)**: Change the selling price
  - **Cost (₹)**: Update your purchase cost
  - **Compare At**: Change the MRP/original price
  - **Stock**: Update available quantity (e.g., after receiving new inventory)
  - **Bin Location**: Change warehouse location
  - **Category**: Switch to a different category
  - **Image URL**: Replace with a new image link

### Step 5: Save Changes
1. Click the blue **Update** button
2. Success toast "Updated" appears
3. The table refreshes with updated data

### Step 6: Verify Changes
1. Open store in new tab → `https://your-site.com/shop`
2. Find the product and verify changes are reflected
3. Click on the product to check the detail page

---

## Common Edit Scenarios

### Scenario 1: Price Change / Sale
1. Open product edit form
2. Set new **Price** (e.g., ₹399)
3. Set **Compare At** to old price (e.g., ₹799)
4. Click **Update**
5. Product now shows "50% OFF" badge on store

### Scenario 2: Restock After New Inventory
1. Open product edit form
2. Change **Stock** from current (e.g., 3) to new count (e.g., 103)
3. Click **Update**
4. Product status changes from CRITICAL/LOW to IN STOCK

### Scenario 3: Change Product Image
1. Upload new image to hosting service
2. Copy the direct image URL
3. Open product edit form
4. Paste new URL in **Image URL** field
5. Click **Update**

### Scenario 4: Move Product to Different Warehouse Bin
1. Open product edit form
2. Change **Bin Location** (e.g., from `Shelf A, Bin 2` to `Shelf C, Bin 1`)
3. Click **Update**
4. New location shows in Warehouse tab

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Edit button not visible | Scroll right in the table to see the Actions column |
| Changes not saving | Check all required fields are filled, try again |
| Old image still showing | Browser may cache the old image, do a hard refresh (Ctrl+Shift+R) |

---

## Time Required
- ~30 seconds per edit
