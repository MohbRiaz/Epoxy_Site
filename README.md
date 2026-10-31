# The Epoxy Studio — website

A fast, mobile-first online store for resin artists. Plain HTML, CSS and
JavaScript — no framework, no build step — plus four small server
functions for checkout and lead capture.

**What it does**
- Homepage, shop with filters (category, craft, price), product pages, resin
  calculator, tutorials and workshop booking, contact and bulk enquiries, policies.
- Cart (saved in the browser), coupon codes (NEW10 included), checkout with
  **Razorpay** (UPI, cards, net banking) and **cash on delivery**.
- If online payment or the server is ever unavailable, customers can send
  their order on **WhatsApp** in one tap — you never lose a sale.
- **Every form and every order becomes a lead** — ready for Odoo CRM.

---

## 1. See it on your computer (2 minutes)

1. Install Node.js 18 or newer from nodejs.org.
2. Open a terminal in this folder and run, once:
   ```
   npm install
   ```
3. Then, any time:
   ```
   node dev-server.js
   ```
4. Open http://localhost:3000 (the server re-reads products.xlsx each time it starts)

Leads and orders are printed in the terminal until you connect Odoo.

## 2. Make it yours

| What | Where |
|---|---|
| **Products, sizes, prices, stock, photos, specs** | **`data/products.xlsx`** (see below) |
| Coupons, shipping, COD rules, category and craft names | `data/catalog.js` |
| WhatsApp number, email, Instagram/YouTube links | top of `assets/js/app.js` (`SITE`) |
| Homepage text, comparison table, FAQ, reviews | `index.html` |
| Tutorials and workshop dates | bottom of `learn.html` |
| Policies | `policies.html` |
| Colours and fonts | top of `assets/css/style.css` (`:root`) |
| Photos | `assets/img/` (see the note in that folder) |

⚠ **Check the imported catalog in `data/products.xlsx` before launch.** Anything shown
as `[__]` on the site is waiting for your real value. Reviews on the homepage
are placeholders — use real customer reviews only.

## Your catalog (imported from the old Odoo site)

`data/products.xlsx` was filled from theepoxystudio.in in October 2026: names, prices
(to the paisa), SKUs, descriptions, how-to steps, specs and up to 4 photos per product.
Separate Odoo listings for each pack size or colour were combined into one product
with options (e.g. the six Clear 2:1 resin packs, the grout's 6 colours × 2 sizes).
Two older ₹999 grout listings are kept on the sheet but hidden.

**Photos still load from the Odoo site.** Before you switch that site off:
```
npm install
npm run download-images
npm run build
```
This copies every photo into `assets/img/remote/` and points the site at the copies.
Commit that folder. If a photo ever fails to load, the site shows a neat placeholder
instead of a broken image.

## Updating products (Excel)

All products live in **`data/products.xlsx`**:
- **Products** sheet: one row per product.
- **Sizes** sheet: one row per size, pack or set, with its price, MRP, stock and SKU.
- The grey row under each column title explains what to type. The "How to use" sheet has the rules.

**To update the live site:** in GitHub, open the `data` folder → **Add file → Upload files**
→ drop in your edited `products.xlsx` (same name) → **Commit changes**.
Vercel rebuilds the shop automatically in about a minute.

**To check on your computer first:** put the file in `data/`, then run `npm run build`
(or restart `node dev-server.js`).

If the spreadsheet has a mistake — a missing price, a duplicate ID, a size for a product
that doesn't exist — the update **stops** and lists each problem with its sheet and row.
On Vercel the failed build appears under **Deployments → Build Logs**, and the
live site keeps the previous product list until you fix it.

Things to keep in mind:
- Don't rename sheets or column titles. You can reorder columns and add rows freely.
- Product IDs become web addresses (`product.html?id=…`); avoid changing them once live.
- Photos: upload them to `assets/img/` and type just the file name in the Image columns.
- "In stock = No" shows a size as sold out; "Show on website = No" hides a product.
- Set **Calculator use** on one coating, one moulds-and-coasters and one deep-pour resin, and fill
  in their "Max pour per layer" and the sizes' "Weight (g)" so the calculator can recommend packs.
- The homepage kit banner uses the product with ID `first-pour-kit`; it hides itself if that product is gone or sold out.
- `data/products.js` is generated from the spreadsheet — never edit it by hand.

## 3. Put it online (free) with Vercel

1. Create a free account at vercel.com and a GitHub account if you don't have one.
2. Upload this folder to a new GitHub repository.
3. In Vercel: **Add New → Project → Import** that repository → **Deploy**.
   Leave the settings as they are — Vercel installs the Excel reader and runs
   `npm run build` (which reads products.xlsx) automatically.
4. **Settings → Domains** → add `theepoxystudio.in` and follow the DNS steps
   at your domain registrar.

Any change you push to GitHub goes live automatically.

## 4. Switch on online payments (Razorpay)

1. Sign up at razorpay.com and complete KYC. Razorpay checks that your site has
   shipping, refund, privacy, terms and contact pages — they're here; fill them in.
2. Razorpay Dashboard → **Account & Settings → API Keys** → generate keys
   (start in **Test mode**).
3. Razorpay Dashboard → **Settings → Webhooks → Add new webhook**:
   - URL: `https://YOUR-DOMAIN/api/razorpay-webhook`
   - Secret: make up a long random password and note it
   - Active event: **order.paid**
4. In Vercel → **Settings → Environment Variables** add:
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (the webhook password)
   and **`NODEJS_HELPERS` = `0`** (lets the webhook check Razorpay's signature). Redeploy.
5. Place a test order with Razorpay's test card or test UPI, check it lands in Shiprocket and
   your CRM, then switch to live keys (and create the same webhook in Live mode).

How it works: when a customer clicks Pay, the server prices the cart from
`products.xlsx` and stores the cart and address on the Razorpay order. After payment,
the order is completed from **Razorpay's own record** — whether the customer's browser
reports back or (if they closed the page) Razorpay's webhook does. Each order is
completed exactly once. If the amount paid ever differs from the catalog price,
the CRM lead is flagged "AMOUNT MISMATCH" so you check before shipping.

## 5. Switch on shipping (Shiprocket)

1. In Shiprocket: **Settings → Pickup Addresses** — note the exact **name** of the
   address you ship from (e.g. "Primary") and its PIN code.
2. **Settings → API → Configure → Create an API User.** Use a *different* email from
   your Shiprocket login. Note the email and password.
3. In Vercel → Environment Variables add:
   ```
   SHIPROCKET_EMAIL            = the API user's email
   SHIPROCKET_PASSWORD         = the API user's password
   SHIPROCKET_PICKUP_LOCATION  = the pickup address name, exactly as in Shiprocket
   SHIPROCKET_PICKUP_PINCODE   = that address's PIN code
   ```
4. Redeploy. Optional but recommended: in `products.xlsx`, fill **Shipping weight (kg)** and
   **Box size (cm)** on the Sizes sheet, and **HSN code** on the Products sheet, so couriers
   charge the right weight and invoices show HSN.

What it does:
- **Every order is created in Shiprocket automatically** — prepaid orders after payment,
  cash-on-delivery orders immediately — with items, SKUs, prices, discount, weight and box size.
  You then assign a courier and print labels in Shiprocket as usual (or turn on Shiprocket's
  auto-assign rules).
- **Checkout checks the PIN code**: shows the expected delivery date, hides cash on delivery
  where couriers can't collect cash, and stops orders to PIN codes nobody delivers to.
- **Product pages** get a "Check delivery" box.
- **Track my order** (`track.html`, linked in the footer and on the order confirmation):
  customers enter their order number + phone and see live courier status.
- If Shiprocket is ever down or rejects an order (e.g. wrong pickup name), the customer's
  order still goes through, and the CRM lead says "Shiprocket order NOT created — create it by hand",
  with the reason.

Turn on Shiprocket's own SMS/email/WhatsApp notifications so customers get dispatch and
delivery updates automatically.

## 6. Connect Odoo CRM (when you're ready)

Every lead and order is already sent to `api/_lib/leads.js`. To make them
appear in Odoo CRM as leads/opportunities:

1. In Odoo, make sure the **CRM** app is installed.
2. Click your avatar → **My Profile → Account Security → New API Key**. Copy it.
3. In Vercel → Environment Variables, add:
   ```
   ODOO_URL      = https://yourcompany.odoo.com
   ODOO_DB       = yourcompany          (database name — on Odoo Online it's usually the subdomain)
   ODOO_USER     = the login email of that Odoo user
   ODOO_API_KEY  = the key from step 2
   ```
4. Redeploy. Submit the contact form once and check CRM.

What lands in Odoo:

| Website action | CRM lead title | Includes |
|---|---|---|
| Cash on delivery order | `COD order TES-… — ₹total — Name` | items, totals, coupon, address, expected revenue |
| Online order | `PAID order TES-… — ₹total — Name` | same + Razorpay payment ID |
| Contact / bulk / industrial form | `Website enquiry — Name` | enquiry type, company, quantity, message |
| Workshop booking | `Workshop booking — Name` | workshop, seats |
| Newsletter | `Newsletter sign-up` | email |

Every lead also records the page and any `utm_source / utm_medium / utm_campaign`
from your ads, so you can see which campaign brought each customer.

**Not using Odoo yet?** Set `LEAD_WEBHOOK_URL` to a Zapier or Make webhook to
send leads to Google Sheets, email or anywhere else. Both can run at once.

**Later upgrade:** orders currently arrive as CRM leads. When you want Odoo to
manage stock and invoices, the same file can create `sale.order` records
instead — a developer can extend `api/_lib/leads.js` without touching the site.

## Files

```
index.html  shop.html  product.html  checkout.html  order-success.html
calculator.html  learn.html  contact.html  policies.html
data/products.xlsx        ← edit your products here
data/products.js          generated from products.xlsx (don't edit)
data/catalog.js           coupons, shipping, categories — shared by site and server
scripts/build-products.js reads products.xlsx, checks it, writes products.js
assets/css/style.css      all styles
assets/js/app.js          header, footer, cart, WhatsApp, lead forms
assets/js/*.js            one script per page
track.html                order tracking for customers
api/config.js             tells the site which services are on
api/lead.js               all forms → CRM
api/create-order.js       prices the order, checks the PIN, starts Razorpay or completes COD
api/verify-payment.js     customer's browser confirms a payment
api/razorpay-webhook.js   Razorpay confirms a payment (backup)
api/shipping.js           delivery date + COD check for a PIN code
api/track.js              order status from Shiprocket
api/_lib/razorpay.js      Razorpay connection
api/_lib/shiprocket.js    Shiprocket connection
api/_lib/fulfil.js        confirmed order → Shiprocket + CRM
api/_lib/leads.js         Odoo CRM + webhook connection
dev-server.js             local preview
tests/run.js              npm test — checks pricing, payments and CRM calls
```

## Before launch checklist
- [ ] Real products, prices, sizes, stock and photos in `data/products.xlsx`
- [ ] WhatsApp number in `assets/js/app.js`
- [ ] Product photos and hero video
- [ ] Policies filled in (needed for Razorpay approval)
- [ ] Razorpay test order → appears in Shiprocket and CRM; then live keys + live webhook
- [ ] Shiprocket API user, pickup name and PIN; shipping weights in products.xlsx
- [ ] `NODEJS_HELPERS=0` set in Vercel
- [ ] Odoo keys; one test enquiry visible in CRM
- [ ] Google Search Console + Analytics / Meta Pixel (paste tags in each page's `<head>`)
