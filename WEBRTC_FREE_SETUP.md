# WebRTC Free Setup Guide

This guide explains how to use **100% free** signaling and TURN/STUN for video calls between users.

## What You Get (All Free)

- **Signaling**: Firestore (Firebase Spark plan) or Socket.IO on free hosting
- **STUN**: Google/Cloudflare public STUN servers
- **TURN**: Free public TURN servers (openrelay.metered.ca) with fallback options

## Quick Start: Switch to Firestore Signaling (Recommended Free Option)

### 1. Enable Firestore Signaling

Create a `.env.local` file in your project root:

```bash
# Use Firestore for signaling (no Socket.IO server needed!)
NEXT_PUBLIC_SIGNALING_MODE=firestore

# Optional: Customize STUN servers (defaults to Google + Cloudflare)
NEXT_PUBLIC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun.cloudflare.com:3478

# Optional: Customize TURN servers (defaults to free openrelay)
NEXT_PUBLIC_TURN_URLS=turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
```

### 2. Deploy Firestore Rules

Your Firestore rules are already configured for WebRTC signaling. Deploy them:

```bash
firebase deploy --only firestore:rules
```

### 3. That's It!

Your app now uses:
- **Firestore** for signaling (free tier: 50K reads, 20K writes/day)
- **Free STUN** servers (Google, Cloudflare)
- **Free TURN** servers (openrelay.metered.ca)

No Socket.IO server needed! No backend hosting costs!

## Alternative: Keep Using Socket.IO

If you prefer Socket.IO, leave `NEXT_PUBLIC_SIGNALING_MODE` unset or set it to `socket`:

```bash
NEXT_PUBLIC_SIGNALING_MODE=socket
```

Then deploy your `signaling-server.js` to a free host:

### Free Socket.IO Hosting Options

1. **Render.com** (free tier)
   - Deploy as a web service
   - Supports WebSockets
   - 750 hours/month free

2. **Fly.io** (free tier)
   - Deploy with `flyctl launch`
   - Supports WebSockets
   - 3 shared VMs free

3. **Railway.app** (free trial)
   - $5 free credit/month
   - Easy deployment

## TURN Server Options (For Better Connectivity)

### Option 1: Use Free Public TURN (Default)

Already configured! Uses `openrelay.metered.ca` (free, no signup).

**Pros**: Zero setup, works immediately
**Cons**: Shared service, may be slower, no SLA

### Option 2: Self-Host TURN on Free VM

For better reliability, run your own TURN server:

#### Oracle Cloud Always Free Tier

1. Create Oracle Cloud account (always free ARM VM)
2. Launch Ubuntu ARM instance
3. Install coturn:

```bash
sudo apt update
sudo apt install coturn -y
```

4. Configure `/etc/turnserver.conf`:

```bash
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_SECRET_HERE
realm=turn.yourdomain.com
total-quota=100
stale-nonce=600
no-multicast-peers
```

5. Start coturn:

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

6. Open firewall ports (Oracle Cloud Console):
   - UDP 3478
   - TCP 3478

7. Update your `.env.local`:

```bash
NEXT_PUBLIC_TURN_URLS=turn:YOUR_VM_IP:3478
NEXT_PUBLIC_TURN_USERNAME=user
NEXT_PUBLIC_TURN_CREDENTIAL=YOUR_SECRET_HERE
```

#### Fly.io Free Tier

Similar process, but use `fly.toml` to configure:

```toml
[services]
  [[services.ports]]
    handlers = []
    port = 3478
    protocol = "udp"
```

### Option 3: Managed TURN (Free Trial/Dev Tiers)

- **Twilio Network Traversal**: Free trial credits
- **Xirsys**: Small free tier (check current limits)
- **LiveKit Cloud**: Generous free dev tier (includes SFU!)

## How It Works (Big Noob Explanation)

### What is Signaling?

When User A wants to call User B, they need to exchange "connection instructions" (like phone numbers). Signaling is just passing these messages back and forth.

**Socket.IO way**: Messages go through your Node.js server
**Firestore way**: Messages are written to a Firestore document that both users watch

### What is STUN?

STUN helps you find your "public address" on the internet (like finding your public IP). Most calls work with just STUN.

### What is TURN?

When STUN fails (strict firewalls, corporate networks), TURN acts as a relay—video goes through the TURN server instead of directly peer-to-peer.

**Without TURN**: ~80-90% of users can connect
**With TURN**: ~99% of users can connect

## Cost Breakdown (Free Tier Limits)

### Firestore Signaling
- **Free tier**: 50K reads, 20K writes, 1GB storage/day
- **Typical call**: ~50 reads + 20 writes = 500 calls/day free
- **Cost after free**: $0.06 per 100K reads, $0.18 per 100K writes

### Socket.IO on Render
- **Free tier**: 750 hours/month (always-on = 720 hours)
- **Cost after**: $7/month for always-on

### TURN Bandwidth
- **Free public TURN**: No cost, but shared/slower
- **Self-hosted (Oracle)**: Free forever (ARM VM)
- **Self-hosted (Fly.io)**: 160GB free outbound/month
- **Typical call**: ~500MB/hour = 320 hours free/month on Fly.io

## Recommended Setup for Zero Cost

```bash
# .env.local
NEXT_PUBLIC_SIGNALING_MODE=firestore
NEXT_PUBLIC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun.cloudflare.com:3478
NEXT_PUBLIC_TURN_URLS=turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
```

This gives you:
- ✅ No backend server needed
- ✅ Free Firestore signaling
- ✅ Free STUN
- ✅ Free TURN (shared)
- ✅ Works for 1:1 video calls
- ✅ ~500 calls/day within free tier

## Upgrading Later

When you grow and need better reliability:

1. **Self-host TURN** on Oracle Free Tier (still $0)
2. **Use managed TURN** (~$0.50-1.00 per GB)
3. **Add SFU** for group calls (LiveKit, mediasoup)

## Testing Your Setup

1. Open browser console during a call
2. Look for these logs:
   - `🧊 ICE servers configured: X` (should see your STUN + TURN)
   - `🔁 Using Firestore for signaling` (if using Firestore mode)
   - `ICE connection state: connected` (means it worked!)
   - `ICE candidate error:` (if you see TURN errors, check credentials)

## Troubleshooting

### "Connection stuck on 'connecting'"
- Check Firestore rules are deployed
- Check browser console for ICE errors
- Verify TURN credentials are correct

### "Some users can't connect"
- You need TURN! Add TURN servers to env
- Check firewall allows UDP on port 3478

### "Firestore quota exceeded"
- You're over 500 calls/day on free tier
- Upgrade to Blaze plan (pay-as-you-go)
- Or switch to Socket.IO signaling

## Questions?

- **Do I need a backend?** No, if using Firestore signaling
- **Is this production-ready?** Yes for small scale (<500 calls/day)
- **What about group calls?** You'll need an SFU (LiveKit, mediasoup)
- **Can I record calls?** Yes, but you'll need storage (Firebase Storage free tier: 5GB)

---

**Summary**: Set `NEXT_PUBLIC_SIGNALING_MODE=firestore` in `.env.local` and you're done. Everything else has sensible free defaults!

