# Mobile Debug Console

Since you need to debug on iPhone without a Mac, add this to your app temporarily:

## Quick Fix: Add Eruda (Mobile Console)

1. Open `src/app/layout.tsx`

2. Add this script to the `<head>`:

```tsx
{process.env.NODE_ENV === 'development' && (
  <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
  <script dangerouslySetInnerHTML={{ __html: 'eruda.init();' }} />
)}
```

3. Refresh your iPhone - you'll see a floating button
4. Tap it to see full console logs!

## Alternative: Use Your Laptop as Debug Screen

Since your laptop IS working and showing logs, the easiest solution is:

**Just check the PHONE'S camera view on the laptop!**

If the laptop can see the phone's video, then ICE is working. If not, the phone isn't sending ICE candidates.

Do you see the phone's video on the laptop screen?

