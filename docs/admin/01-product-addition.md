# How to Add a New Product

## Overview
This guide walks you through adding a new product to your Snap Aligner store, from opening the admin panel to seeing the product live on your store.

---

## Step-by-Step Instructions

### Step 1: Open Admin Dashboard
1. Open your browser
2. Go to: `https://your-site.com/admin`
3. You will see the **Admin Login** screen (dark background with a password field)

### Step 2: Login
1. Type your admin password in the password field
   - Default password: `snapalign2026`
2. Click the **Login** button
3. You'll be taken to the Admin Dashboard showing stats (Revenue, Profit, Orders, Users)

### Step 3: Navigate to Products Tab
1. Look at the tabs below the stats cards: **Orders | Products | Warehouse | Dead Stock | Settings**
2. Click on **Products**
3. You'll see a table listing all current products with their name, category, price, cost, stock, bin location

### Step 4: Click "Add Product"
1. In the top-right corner of the Products tab, click the blue **+ Add Product** button
2. A popup form will appear

### Step 5: Fill in Product Details

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Name** | Product title shown to customers | `Ultra Slim iPhone 15 Case` |
| **Description** | Detailed product description | `0.3mm ultra-thin matte case with anti-fingerprint coating...` |
| **Price (₹)** | Selling price in INR | `499` |
| **Cost (₹)** | Your purchase/manufacturing cost | `120` |
| **Compare At** | Original/MRP price (shows as strikethrough) | `999` |
| **Stock** | Number of units available | `100` |
| **Bin Location** | Warehouse shelf/bin location | `Shelf B, Bin 4` |
| **Category** | Select from dropdown | `Cases` |
| **Image URL** | Direct link to product image | `https://example.com/case.jpg` |

#### Available Categories:
- Tempered Glass
- Cases
- Holders
- Cables & Chargers

### Step 6: Save the Product
1. Review all fields are filled correctly
2. Click the blue **Create** button
3. A success toast message "Created" will appear in the bottom-right
4. The popup will close automatically
5. Your new product will appear in the Products table

### Step 7: Verify on Store
1. Open a new browser tab
2. Go to: `https://your-site.com/shop`
3. Your new product should appear in the product grid
4. Click on it to verify the detail page looks correct

---

## Tips
- **Compare At Price**: Set this higher than the selling price to show a "XX% OFF" badge. Example: Price ₹499, Compare At ₹999 = "50% OFF"
- **Stock Alerts**: If stock is 5-20, it shows "LOW STOCK" yellow badge. Below 5 shows "ALMOST GONE" red badge
- **Bin Location**: Use a consistent format like `Shelf A, Bin 1` for easy warehouse picking
- **Image URL**: Use high-quality square images (at least 600x600px). You can upload to services like Imgur, Cloudinary, or Google Drive (set to public)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Product not showing on store | Wait 2-3 seconds, refresh the shop page |
| Image not loading | Check the image URL is a direct link ending in .jpg/.png/.webp |
| Price shows wrong format | Enter numbers only, no commas or ₹ symbol |
| Category missing | Only the 4 categories listed above are available |

---

## Time Required
- First time: ~3 minutes
- After practice: ~1 minute per product
