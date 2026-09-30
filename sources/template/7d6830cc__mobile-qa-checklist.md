# Belle Realty PWA — Mobile QA Checklist

**Target devices:** iOS Safari (iPhone 13+), Android Chrome (Pixel 6+), and an iPad in Safari for tablet sanity.
**Base URL:** https://web-production-d4ab6.up.railway.app
**Test portal user:** `tenant@jasonsdeli.com` (Adam controls this — safe to log in as).
**Property under test:** On The Boulevard — `cmoqosmgk0001unv20s16ik1j`.

> Sandbox limitation: this app cannot be driven through a real iOS Safari or Android Chrome browser from the agent runtime. The list below is the audit you (or whoever picks up this device pass) should walk through. Each row is a single discrete check — pass/fail/notes columns recommended.

## 1. Static audit already completed in code (May 11, 2026)

| Concern | Status | Evidence |
|---|---|---|
| Viewport meta `width=device-width, initial-scale=1` | ✅ | `apps/web/src/app/layout.tsx` |
| PWA manifest (`/manifest.webmanifest`) + theme-color | ✅ | manifest icons 192/512, theme-color `#0f172a` |
| Sticky nav (`sticky top-14`) survives scroll | ✅ | nav, sub-nav components |
| Responsive utility coverage | ✅ | 133 `sm:` / `md:` / `lg:` / `xl:` usages |
| Overflow guards on tables / wide content | ✅ | 83 `overflow-*` / `scroll-*` usages |
| Touch-target sizing on primary buttons (`h-10` / `h-11`) | ✅ | `components/ui/button.tsx` |
| Dev-mode banner gated off in prod (`NEXT_PUBLIC_HIDE_DEV_BANNER=true`) | ✅ | `components/ui/dev-mode-banner.tsx` deployed `0817c8ec` |

## 2. Authentication & session

- [ ] `/login` form: keyboard does not cover the submit button on iPhone SE-class screens
- [ ] Email field triggers email keyboard; password field triggers password keyboard
- [ ] "Show password" toggle works one-handed on a small screen
- [ ] Session persists after putting the app in the background for 10+ minutes
- [ ] Logout returns to `/login` with no flash of authenticated UI
- [ ] `/portal/auth/forgot-password` — confirm the response no longer leaks `resetToken` in prod (`NODE_ENV=production` gate already in code)

## 3. Tenant invite & set-password (mobile-only path)

- [ ] Open the invite link from email on iOS Safari — no white flash
- [ ] Set-password page: both fields visible above the fold
- [ ] Submit redirects to portal landing, not login
- [ ] After mock-mode invite, response no longer leaks `tempPassword`/`verifyToken` (prod gate)

## 4. Leases (`/leases`, `/leases/[id]`, `/leases/new`)

- [ ] Lease index table scrolls horizontally without breaking the layout
- [ ] Lease row tap-target is comfortable (≥ 44pt)
- [ ] `/leases/[id]` detail: tabs/sections reflow into a vertical stack on phone
- [ ] `/leases/new`: every step of the form keeps inputs in view as the keyboard opens
- [ ] Currency / percent fields use numeric keyboards
- [ ] Date pickers fall back to native iOS / Android pickers

## 5. Invoices

- [ ] Invoice list legible at phone width — amounts right-aligned, not clipped
- [ ] "Generate invoice" flow completes on phone
- [ ] PDF download opens in Safari's PDF viewer / Chrome's viewer (no blank page)
- [ ] Email-send action shows toast feedback (`default` or `success` variant) within ~2s

## 6. Notices

- [ ] Notice creation form fits on phone
- [ ] Generated PDF downloads on iOS Safari (uses `Content-Disposition`)
- [ ] Long tenant names don't break the notice header layout

## 7. Payments (ACH recording flow)

- [ ] Payment entry: amount field uses numeric keyboard, no `e` allowed
- [ ] Date field uses native picker
- [ ] Allocation across charges works on a phone (no off-screen rows)
- [ ] Success toast is visible (not hidden behind nav or keyboard)

## 8. Compliance

- [ ] `/compliance` loads against real propertyId — no `?propertyId=demo` query
- [ ] Cards stack vertically on phone, no horizontal scroll
- [ ] Status badges remain readable (color + label, not color alone)

## 9. Tenant portal

- [ ] `/portal/login` works on the test account
- [ ] Statements list legible
- [ ] Pay-link / payment instructions visible above the fold
- [ ] No dev banner visible in prod

## 10. PWA install behaviors

- [ ] iOS Safari: "Add to Home Screen" produces a clean icon (no white halo)
- [ ] Android Chrome: install prompt appears at least once
- [ ] Installed app launches in standalone mode (no Safari chrome)
- [ ] Network-loss banner / offline behavior is acceptable (or at least not a white-screen crash)

## 11. Accessibility quick pass (mobile)

- [ ] Dynamic type / Larger Text setting on iOS doesn't break primary screens
- [ ] VoiceOver reads buttons by their visible label, not "button button"
- [ ] Focus rings visible when using a Bluetooth keyboard

## 12. Performance smoke

- [ ] First load on a 4G throttle finishes < 4s
- [ ] Subsequent navigations feel instant (SSR + cached chunks)
- [ ] No console errors / red toasts on a happy path

---

**How to record results:** copy this file into a new dated note, mark each box, attach a 10-second screen recording per failing item. Hand back to engineering with file path + commit SHA of the build under test.
