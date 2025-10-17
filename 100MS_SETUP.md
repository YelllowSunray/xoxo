# 100ms Integration Setup

Your app now supports **100ms** for reliable 1‑on‑1 video calls with zero infrastructure! 🎉

## What You Get

- ✅ **10,000 free minutes/month** (dev tier)
- ✅ **Managed TURN/SFU** (no servers to run)
- ✅ **Works on mobile Safari** (better than DIY WebRTC)
- ✅ **Multiple simultaneous 1‑on‑1 calls** (5–10+ pairs)

## Setup Steps

### 1. Create 100ms Account

1. Go to [https://dashboard.100ms.live/register](https://dashboard.100ms.live/register)
2. Sign up (free)
3. Create a new app/workspace

### 2. Create a Template

1. In the 100ms dashboard, go to **Templates**
2. Click **Create Template**
3. Choose **Video Conferencing**
4. Add two roles:
   - `host` (can publish audio/video, can end room)
   - `guest` (can publish audio/video)
5. Save the template

### 3. Get Your Credentials

1. Go to **Developer** section in dashboard
2. Copy these values:
   - **App Access Key** (starts with `6...`)
   - **App Secret** (long string)

### 4. Add Environment Variables

Create/update `.env.local`:

```bash
# 100ms Credentials (server-side only, never expose to client)
HMS_APP_ACCESS_KEY=your_app_access_key_here
HMS_APP_SECRET=your_app_secret_here

# Enable 100ms video provider
NEXT_PUBLIC_VC_PROVIDER=100ms
```

### 5. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 6. Test It!

1. Open your app in two browsers (or one normal + one incognito)
2. Sign in as different users
3. Start a video call
4. You should see:
   - `🎯 Joining 100ms room: ...`
   - `✅ Joined 100ms room`
   - Video should connect within 2–3 seconds

## How It Works

### Room Creation

- Each 1‑on‑1 call gets a unique room ID: `{uidA}_{uidB}` (sorted)
- Multiple pairs can have separate rooms simultaneously
- Rooms are created on-demand (no pre-creation needed)

### Token Flow

1. Client requests token from `/api/hms-token`
2. Server mints a short-lived token using your credentials
3. Client joins room with the token
4. 100ms handles all media routing, TURN, NAT traversal

### Cost Estimate

- **Free tier**: 10,000 participant-minutes/month
- **1‑on‑1 call**: 2 participants × duration
- **Example**: 30-min call = 60 participant-minutes
- **~166 half-hour calls/month free** (10,000 / 60)

After free tier:
- $0.004 per participant-minute
- 30-min 1‑on‑1 call = 60 × $0.004 = **$0.24**

## Switching Between Providers

### Use 100ms (Recommended)

```bash
NEXT_PUBLIC_VC_PROVIDER=100ms
```

### Use DIY WebRTC P2P (Free but less reliable)

```bash
# Remove or comment out:
# NEXT_PUBLIC_VC_PROVIDER=100ms

# Keep Firestore signaling:
NEXT_PUBLIC_SIGNALING_MODE=firestore
```

## Troubleshooting

### "Failed to get 100ms token"

- Check that `HMS_APP_ACCESS_KEY` and `HMS_APP_SECRET` are set in `.env.local`
- Restart dev server after adding env vars
- Check browser console for API errors

### "Connection stuck on connecting"

- Verify your 100ms template has `guest` role enabled
- Check 100ms dashboard for room/session logs
- Ensure both users are using the same `NEXT_PUBLIC_VC_PROVIDER`

### "Black screen but says connected"

- Mobile Safari may require a tap to start video playback
- Check browser console for autoplay errors
- Ensure camera/mic permissions are granted

## Production Deployment

### Vercel/Netlify

Add environment variables in your hosting dashboard:
- `HMS_APP_ACCESS_KEY` (secret)
- `HMS_APP_SECRET` (secret)
- `NEXT_PUBLIC_VC_PROVIDER=100ms` (public)

### Security Notes

- ✅ `HMS_APP_ACCESS_KEY` and `HMS_APP_SECRET` are server-only (never exposed to client)
- ✅ Client tokens are short-lived (expire after session)
- ✅ Room IDs are deterministic but unpredictable (sorted UUIDs)

## Monitoring Usage

1. Go to [100ms Dashboard](https://dashboard.100ms.live/)
2. Check **Usage** tab
3. See participant-minutes consumed
4. Set up billing alerts before hitting free tier limit

## Next Steps

- ✅ Test with 2+ simultaneous calls
- ✅ Monitor usage in 100ms dashboard
- ✅ Add recording (100ms supports cloud recording)
- ✅ Add chat/screen-share (100ms SDK supports it)

---

**Questions?** Check [100ms docs](https://www.100ms.live/docs) or your current setup is ready to go! 🚀

