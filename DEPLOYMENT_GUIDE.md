# SnapAlign Deployment Guide
## Free Stack: Vercel + Render + MongoDB Atlas

**Your Domain:** snapalign.in (currently on Netlify)

---

## 🗄️ STEP 1: MongoDB Atlas Setup (5 mins)

### 1.1 Create Account & Cluster
1. Go to [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up (free)
3. Create Organization → Create Project named `snapalign`
4. Click **"Build a Database"**
5. Select **M0 FREE** tier
6. Choose **aws** provider, Region: **Mumbai (ap-south-1)** (closest to India)
7. Cluster name: `snapalign-cluster`
8. Click **"Create Cluster"** (takes 1-3 mins)

### 1.2 Create Database User
1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication: Password
4. Username: `snapalign_user`
5. Password: Generate secure password → **SAVE THIS PASSWORD**
6. Database User Privileges: **Read and write to any database**
7. Click **"Add User"**

### 1.3 Configure Network Access
1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
4. Click **"Confirm"**

### 1.4 Get Connection String
1. Go to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: Python, Version: 3.12 or later
5. Copy connection string:
   ```
   mongodb+srv://snapalign_user:<password>@snapalign-cluster.xxxxx.mongodb.net/snapalign?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password
7. **SAVE THIS URL** - you'll need it for Render

---

## 🖥️ STEP 2: Deploy Backend on Render (10 mins)

### 2.1 Push Code to GitHub
If not already done:
```bash
git init
git add .
git commit -m "SnapAlign ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/snapalign.git
git push -u origin main
```

### 2.2 Create Render Account & Service
1. Go to [render.com](https://render.com) → Sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub → Select your `snapalign` repo
4. Configure:

| Setting | Value |
|---------|-------|
| Name | `snapalign-backend` |
| Region | `Singapore (Southeast Asia)` |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| Instance Type | `Free` |

### 2.3 Add Environment Variables
In Render dashboard → Environment tab:

| Key | Value |
|-----|-------|
| `MONGO_URL` | `mongodb+srv://snapalign_user:YOUR_PASSWORD@snapalign-cluster.xxxxx.mongodb.net/snapalign?retryWrites=true&w=majority` |
| `DB_NAME` | `snapalign` |
| `CORS_ORIGINS` | `*` |
| `ADMIN_PASSWORD` | `snapalign2026` (or your preferred password) |
| `RAZORPAY_KEY_ID` | `rzp_test_DEMO_MODE` (or your real key) |
| `RAZORPAY_KEY_SECRET` | `DEMO_SECRET_REPLACE_ME` (or your real secret) |

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 mins first time)
3. Copy your backend URL: `https://snapalign-backend.onrender.com`
4. Test: Visit `https://snapalign-backend.onrender.com/api/health`

---

## 🌐 STEP 3: Deploy Frontend on Vercel (10 mins)

### 3.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import your `snapalign` GitHub repo

### 3.2 Configure Build Settings
| Setting | Value |
|---------|-------|
| Framework Preset | `Create React App` |
| Root Directory | `frontend` |
| Build Command | `yarn build` |
| Output Directory | `build` |

### 3.3 Add Environment Variables
| Key | Value |
|-----|-------|
| `REACT_APP_BACKEND_URL` | `https://snapalign-backend.onrender.com` |

### 3.4 Deploy
1. Click **"Deploy"**
2. Wait 2-3 mins
3. Your app is live at: `https://snapalign.vercel.app`

---

## 🔗 STEP 4: Connect Your Domain (snapalign.in)

### Option A: Point Domain to Vercel (Recommended)

#### 4.1 Add Domain in Vercel
1. Go to your Vercel project → **Settings** → **Domains**
2. Add domain: `snapalign.in`
3. Also add: `www.snapalign.in`

#### 4.2 Update DNS in Netlify (or your domain registrar)
1. Go to Netlify → Domain settings for snapalign.in
2. Remove existing DNS records
3. Add new records:

| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

#### 4.3 Wait for Propagation
- Takes 5 mins to 48 hours
- Check: [dnschecker.org](https://dnschecker.org)

### Option B: Transfer Domain from Netlify to Vercel

1. In Netlify: Domain settings → Remove domain
2. In Vercel: Add domain → Follow verification steps
3. Update nameservers at your registrar (GoDaddy/Namecheap/etc)

---

## ✅ STEP 5: Final Verification

### Test Checklist:
- [ ] `https://snapalign.in` loads homepage
- [ ] Products display correctly
- [ ] Google login works
- [ ] Add to cart works
- [ ] Checkout process works (demo mode)
- [ ] Admin panel accessible at `/admin`
- [ ] Order tracking works at `/track`

### If Checkout Not Working:
1. Check browser console (F12) for errors
2. Verify `REACT_APP_BACKEND_URL` is correct in Vercel
3. Test backend directly: `https://snapalign-backend.onrender.com/api/payment/config`
4. Check Render logs for backend errors

---

## 🔧 Troubleshooting

### Backend "Sleeping" on Render Free Tier
- First request after 15 mins inactivity takes ~30 seconds
- Solution: Use [UptimeRobot](https://uptimerobot.com) to ping every 14 mins (free)

### CORS Errors
- Ensure `CORS_ORIGINS=*` in Render environment
- Or set specific: `CORS_ORIGINS=https://snapalign.in,https://www.snapalign.in`

### MongoDB Connection Failed
- Verify connection string in Render
- Check Network Access allows `0.0.0.0/0`
- Ensure password has no special characters that need encoding

---

## 📊 Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M0 Free | $0 |
| Render | Free | $0 |
| Vercel | Hobby | $0 |
| **Total** | | **$0/month** |

---

## 🚀 Production Upgrade Path

When ready for production (removes sleep, faster):

| Service | Paid Plan | Cost |
|---------|-----------|------|
| MongoDB Atlas | M10 | $57/month |
| Render | Starter | $7/month |
| Vercel | Pro | $20/month |
| **Total** | | **$84/month** |

Or use **Emergent**: $10/month for everything!
