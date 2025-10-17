# Video Call Setup Summary

You now have **TWO video call options** in your app! 🎉

## Option 1: 100ms (Recommended) ⭐

**Best for:** Production, mobile Safari, reliability

### Setup:
1. Create free account at [100ms.live](https://dashboard.100ms.live/register)
2. Create template with `host` and `guest` roles
3. Get App Access Key + App Secret
4. Add to `.env.local`:
```bash
HMS_APP_ACCESS_KEY=your_key
HMS_APP_SECRET=your_secret
NEXT_PUBLIC_VC_PROVIDER=100ms
```
5. Restart: `npm run dev`

**Free tier:** 10,000 minutes/month (~166 half-hour 1‑on‑1 calls)

📖 **Full guide:** [100MS_SETUP.md](./100MS_SETUP.md)

---

## Option 2: DIY WebRTC P2P (Free Forever)

**Best for:** Learning, $0 infrastructure, same-network testing

### Setup:
1. Add to `.env.local`:
```bash
NEXT_PUBLIC_SIGNALING_MODE=firestore
# Leave NEXT_PUBLIC_VC_PROVIDER unset or remove it
```
2. Deploy Firestore rules: `firebase deploy --only firestore:rules`
3. Restart: `npm run dev`

**Limitations:**
- May not work on mobile Safari (ICE gathering issues)
- Requires TURN for different networks (self-host coturn)
- Less reliable than managed solution

📖 **Full guide:** [WEBRTC_FREE_SETUP.md](./WEBRTC_FREE_SETUP.md)

---

## Which Should You Use?

| Feature | 100ms | DIY WebRTC |
|---------|-------|------------|
| **Reliability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mobile Safari** | ✅ Works | ❌ Often fails |
| **Setup time** | 5 min | 30+ min |
| **Cost (dev)** | Free 10k min | Free unlimited |
| **Cost (prod)** | $0.004/participant-min | $0 (if self-host TURN) |
| **Maintenance** | Zero | Medium (TURN server) |

**Recommendation:** Start with 100ms for development and testing. Switch to DIY WebRTC later if you want to self-host everything.

---

## Current Status

✅ Both options are integrated and ready
✅ Toggle via `NEXT_PUBLIC_VC_PROVIDER` env var
✅ Firestore rules deployed
✅ 100ms SDK installed

## Next Steps

1. **Choose your provider** (add env var)
2. **Restart dev server**
3. **Test with 2 browsers**
4. **Deploy to production** (add env vars to Vercel/Netlify)

---

## Quick Test

### Test 100ms:
```bash
# .env.local
NEXT_PUBLIC_VC_PROVIDER=100ms
HMS_APP_ACCESS_KEY=...
HMS_APP_SECRET=...
```

### Test DIY WebRTC:
```bash
# .env.local
NEXT_PUBLIC_SIGNALING_MODE=firestore
# (remove or comment out NEXT_PUBLIC_VC_PROVIDER)
```

---

**Questions?** Check the detailed guides or the console logs during a call! 🚀

