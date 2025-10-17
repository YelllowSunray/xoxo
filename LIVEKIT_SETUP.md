# LiveKit Cloud Setup (Recommended) ⭐

Your app now supports **LiveKit** for rock-solid 1‑on‑1 video calls! Works great on mobile Safari and handles multiple simultaneous calls.

## What You Get (Free Tier)

- ✅ **5,000 participant-minutes/month** (~83 half-hour 1‑on‑1 calls)
- ✅ **Managed TURN/SFU** (zero infrastructure)
- ✅ **Works perfectly on mobile Safari** 
- ✅ **Multiple simultaneous 1‑on‑1 calls** (5–10+ pairs)
- ✅ **Built-in recording** (optional, cloud storage)

## Setup Steps (5 Minutes)

### 1. Create LiveKit Cloud Account

1. Go to [https://cloud.livekit.io/](https://cloud.livekit.io/)
2. Sign up (free, no credit card required)
3. Create a new project

### 2. Get Your Credentials

In the LiveKit Cloud dashboard:

1. Go to **Settings** → **Keys**
2. Click **Create Key**
3. Copy these values:
   - **API Key** (starts with `API...`)
   - **API Secret** (long string, shown once!)
   - **WebSocket URL** (looks like `wss://your-project-xxxxxx.livekit.cloud`)

### 3. Add Environment Variables

Update your `.env.local`:

```bash
# LiveKit Cloud Credentials (server-side only)
LIVEKIT_API_KEY=APIxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_secret_here

# LiveKit WebSocket URL (client-side)
NEXT_PUBLIC_LIVEKIT_URL=wss://xoxo-4t6ardn5.livekit.cloud

# Enable LiveKit provider
NEXT_PUBLIC_VC_PROVIDER=livekit
```

### 4. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 5. Test It!

1. Open two browsers (or one normal + one incognito)
2. Sign in as different users
3. Start a video call
4. Should connect in 1–2 seconds with video! 🎉

## How It Works (Big Noob Explanation)

### What is LiveKit?

Think of LiveKit as a "video call post office":
- Your app asks for a "stamp" (token) from your server
- Both users join a "room" (like a private video chat room)
- LiveKit handles all the complicated networking stuff (TURN, NAT, etc.)
- Video flows through LiveKit's servers (super reliable!)

### Room Creation

- Each 1‑on‑1 call = one room
- Room name: `{uidA}_{uidB}` (sorted, so both users join the same room)
- Multiple pairs = multiple rooms (all running simultaneously)
- Rooms are created automatically when first user joins

### Token Flow

1. Client → Your server: "I want to join room X"
2. Your server → LiveKit: "Give me a token for user Y in room X"
3. Your server → Client: "Here's your token"
4. Client → LiveKit Cloud: "Let me in!" (with token)
5. LiveKit: "Welcome! Here's the video stream from the other person"

## Cost Breakdown

### Free Tier (Perfect for Development)

- **5,000 participant-minutes/month**
- **1‑on‑1 call**: 2 participants × duration
- **Examples:**
  - 30-min call = 60 participant-minutes
  - **~83 half-hour calls/month free**
  - 60-min call = 120 participant-minutes
  - **~41 one-hour calls/month free**

### After Free Tier

- **$0.004 per participant-minute**
- **Examples:**
  - 30-min 1‑on‑1 call = 60 × $0.004 = **$0.24**
  - 100 calls/month = ~$24/month
  - 500 calls/month = ~$120/month

### Compared to Other Options

| Provider | Free Tier | After Free |
|----------|-----------|------------|
| **LiveKit** | 5,000 min | $0.004/participant-min |
| **100ms** | 10,000 min | $0.004/participant-min |
| **Daily** | 10,000 min | $0.002/participant-min |
| **DIY WebRTC** | Unlimited | $0 (if self-host TURN) |

## Testing Locally

After adding credentials to `.env.local` and restarting:

1. Open browser console
2. Look for:
```
🎯 Fetching LiveKit token for room: ...
✅ LiveKit token received
```

3. Video should appear within 2 seconds
4. Works on mobile Safari! 📱

## Production Deployment

### Vercel/Netlify

Add environment variables in your hosting dashboard:

**Server-side (secret):**
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

**Client-side (public):**
- `NEXT_PUBLIC_LIVEKIT_URL` (your WebSocket URL)
- `NEXT_PUBLIC_VC_PROVIDER=livekit`

### Security Notes

- ✅ API Key/Secret are server-only (never exposed to client)
- ✅ Tokens are short-lived (expire after session)
- ✅ Room names are deterministic but unpredictable (sorted UUIDs)
- ✅ LiveKit handles all authentication

## Switching Between Providers

You now have **3 video call options**:

### Use LiveKit (Recommended for Production) ⭐
```bash
NEXT_PUBLIC_VC_PROVIDER=livekit
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_LIVEKIT_URL=wss://...
```

### Use 100ms (Also Great)
```bash
NEXT_PUBLIC_VC_PROVIDER=100ms
HMS_APP_ACCESS_KEY=...
HMS_APP_SECRET=...
```

### Use DIY WebRTC (Free Forever, Less Reliable)
```bash
NEXT_PUBLIC_SIGNALING_MODE=firestore
# Remove or comment out NEXT_PUBLIC_VC_PROVIDER
```

## Features

### What Works Now
- ✅ 1‑on‑1 video calls
- ✅ Audio/video controls
- ✅ Mobile Safari support
- ✅ Multiple simultaneous calls
- ✅ Connection status
- ✅ Call duration tracking

### What You Can Add (LiveKit Supports)
- 🎥 Cloud recording (built-in)
- 💬 Chat messages (SDK supports it)
- 🖥️ Screen sharing (SDK supports it)
- 👥 Group calls (3+ people)
- 📊 Analytics (dashboard)

## Monitoring Usage

1. Go to [LiveKit Cloud Dashboard](https://cloud.livekit.io/)
2. Check **Usage** tab
3. See participant-minutes consumed
4. Set up billing alerts

## Troubleshooting

### "Failed to get token"
- Check `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in `.env.local`
- Restart dev server after adding env vars
- Check browser console for API errors

### "Connection failed"
- Verify `NEXT_PUBLIC_LIVEKIT_URL` is correct (starts with `wss://`)
- Check LiveKit dashboard for room/session logs
- Ensure both users are using `NEXT_PUBLIC_VC_PROVIDER=livekit`

### "Black screen"
- Mobile Safari may require a tap to start video
- Check camera/mic permissions
- Look for errors in browser console

## Why LiveKit Over Others?

- ✅ **Best mobile support** (works great on iOS Safari)
- ✅ **Easiest integration** (fewer lines of code)
- ✅ **Self-host option** (can move to your own server later)
- ✅ **Great docs** and active community
- ✅ **Built-in recording** (no extra setup)

## Next Steps

1. ✅ Create LiveKit Cloud account
2. ✅ Get credentials
3. ✅ Add to `.env.local`
4. ✅ Restart dev server
5. ✅ Test with 2 browsers
6. ✅ Test on mobile (should work perfectly!)
7. ✅ Deploy to production

---

**Questions?** Check [LiveKit docs](https://docs.livekit.io/) or you're ready to go! 🚀

**Current status:** LiveKit is fully integrated and ready to use. Just add your credentials!

