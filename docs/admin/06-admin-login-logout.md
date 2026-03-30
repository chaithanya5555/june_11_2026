# How to Login & Logout of Admin Dashboard

## Overview
The admin dashboard is password-protected. This guide covers accessing, logging in, and logging out.

---

## Logging In

### Step 1: Open Admin URL
1. Open your browser (Chrome, Safari, Firefox, Edge)
2. Type in the address bar: `https://your-site.com/admin`
3. Press Enter

### Step 2: Enter Password
1. You'll see a dark login screen with a password field
2. Type the admin password:
   - Default: `snapalign2026`
   - Or your custom password if you changed it
3. Click the blue **Login** button

### Step 3: Dashboard Loads
1. If password is correct → Dashboard loads with stats
2. If password is wrong → Error toast "Invalid password" appears
3. Try again with the correct password

### What You'll See After Login
- **Stats cards**: Revenue, Net Profit, Projected Revenue, Orders, Users
- **Tabs**: Orders, Products, Warehouse, Dead Stock, Settings
- **Critical Stock Alert** banner (if any products are below 5 units)

---

## Logging Out

### Method 1: Logout Button
1. Click the **Logout** button in the top-right corner of the dashboard
2. You're immediately taken back to the login screen
3. Session is cleared

### Method 2: Close Browser
- Your session lasts 7 days
- If you close the browser and reopen within 7 days, you'll still be logged in
- After 7 days, you'll need to login again

---

## Changing Password

### From Admin Dashboard
1. Login to admin
2. Click **Settings** tab
3. Scroll to "Admin Password" section
4. Enter new password
5. Click **Save Settings**
6. **Important**: Remember this new password!

---

## Forgot Password

If you forgot your admin password:

### Option 1: Edit .env File (if you have server access)
1. Open terminal/SSH
2. Edit: `/app/backend/.env`
3. Find: `ADMIN_PASSWORD=your_current_password`
4. Change to: `ADMIN_PASSWORD=your_new_password`
5. Restart: `sudo supervisorctl restart backend`

### Option 2: Reset via Database
1. Open MongoDB shell
2. Run: `use('test_database'); db.admin_sessions.deleteMany({});`
3. This clears all admin sessions
4. Reset the password in .env file

---

## Security Best Practices
- Change the default password immediately after first login
- Use a strong password (12+ characters, mix of letters, numbers, symbols)
- Don't share your admin URL publicly
- Log out when using shared computers

---

## Time Required
- Login: ~5 seconds
- Logout: ~2 seconds
