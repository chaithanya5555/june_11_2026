# SnapAlign Free Deployment Guide

Deploy your SnapAlign e-commerce website for FREE using:
- **MongoDB Atlas** (Database) - Free 512MB
- **Render** (Backend) - Free tier
- **Vercel** (Frontend) - Free tier

---

## Step 1: MongoDB Atlas (Database)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Click **"Build a Database"** → Select **"M0 FREE"**
4. Choose a cloud provider & region (any works)
5. Set **Database Access**:
   - Click "Database Access" → "Add New Database User"
   - Username: `snapalign`
   - Password: Create a strong password (save it!)
   - Role: "Read and write to any database"
6. Set **Network Access**:
   - Click "Network Access" → "Add IP Address"
   - Click **"Allow Access from Anywhere"** (0.0.0.0/0)
7. Get Connection String:
   - Go to "Database" → Click **"Connect"**
   - Select "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Replace `<dbname>` with `snapalign`

**Your MONGO_URL will look like:**
```
mongodb+srv://snapalign:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/snapalign?retryWrites=true&w=majority
```

---

## Step 2: Render (Backend)

1. Go to [render.com](https://render.com) and sign up (use GitHub)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository (or use "Public Git repository")
4. Configure:
   - **Name:** `snapalign-backend`
   - **Region:** Choose nearest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Select **"Free"** plan
6. Add **Environment Variables:**
   ```
   MONGO_URL = <your MongoDB Atlas connection string>
   DB_NAME = snapalign
   ADMIN_PASSWORD = snapalign2026
   RAZORPAY_KEY_ID = rzp_test_SzLmBkN29N9fMr
   RAZORPAY_KEY_SECRET = tpU4YCo3WkSecrH1C3Y7cMgY
   ```
7. Click **"Create Web Service"**
8. Wait for deployment (5-10 minutes)
9. Copy your backend URL: `https://snapalign-backend.onrender.com`

---

## Step 3: Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) and sign up (use GitHub)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `yarn build`
   - **Output Directory:** `build`
5. Add **Environment Variable:**
   ```
   REACT_APP_BACKEND_URL = https://snapalign-backend.onrender.com
   ```
   (Use your actual Render backend URL from Step 2)
6. Click **"Deploy"**
7. Wait for deployment (2-3 minutes)
8. Your site is live! 🎉

---

## Step 4: Initialize Data

After deployment, seed the database:

```bash
curl -X POST https://snapalign-backend.onrender.com/api/seed
```

---

## Important Notes

### ⚠️ Free Tier Limitations

- **Render Free Tier:** Backend sleeps after 15 minutes of inactivity
  - First request after sleep takes 30-60 seconds (cold start)
  - Keep-alive services can help (but may violate ToS)

- **MongoDB Atlas Free:** 512MB storage limit
  - Enough for thousands of products and orders

- **Vercel Free:** 100GB bandwidth/month
  - More than enough for most small businesses

### 🔧 Updating Your Site

1. Push changes to GitHub
2. Render & Vercel auto-deploy on push
3. Database persists between deployments

### 🔒 Security Checklist

- [ ] Change `ADMIN_PASSWORD` to something secure
- [ ] Use strong MongoDB password
- [ ] Update Razorpay to live keys for production
- [ ] Add allowed admin emails for OAuth

---

## Troubleshooting

**Backend not starting?**
- Check Render logs for errors
- Verify MONGO_URL is correct
- Ensure IP is whitelisted in MongoDB Atlas

**Frontend can't reach backend?**
- Check REACT_APP_BACKEND_URL is correct
- Verify backend is running on Render
- Check browser console for CORS errors

**Database connection failed?**
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check username/password in connection string
- Ensure cluster is not paused (Atlas pauses after 60 days inactivity)

---

## Estimated Costs: $0/month

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M0 (Free) | $0 |
| Render | Free | $0 |
| Vercel | Hobby | $0 |
| **Total** | | **$0** |

Upgrade to paid plans when your business grows! 🚀
