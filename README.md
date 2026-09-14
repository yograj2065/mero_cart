# MeroCart

MeroCart is a lightweight online storefront for browsing products, managing a cart, and sending orders directly to WhatsApp. Product data can be stored locally for simple use or shared across devices with Supabase.

## Features

- Responsive product catalogue
- Product search, wishlist, and cart
- WhatsApp order checkout
- eSewa payment information and QR code
- Admin product management
- Supabase product storage with realtime updates
- Vercel-ready deployment

## Project Files

- `merocart.html` - storefront markup and admin interface
- `styles.css` - responsive styling and visual design
- `app.js` - catalogue, cart, wishlist, checkout, and admin logic
- `supabase-setup.sql` - database table and row-level security policies
- `vercel.json` - routes the site root to `merocart.html`
- `esewa-qr.png` - eSewa payment QR image

## Run Locally

Because this is a static site, it can be opened directly in a browser. A local server is recommended:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run [`supabase-setup.sql`](supabase-setup.sql).
4. Confirm that the Supabase URL and publishable key in `app.js` belong to your project.

The app uses the `products` table for shared catalogue data. If Supabase is unavailable, the storefront falls back to browser `localStorage`.

## Admin Catalogue

Open the small `ad` link beneath the MeroCart logo to access product management. The demo login is currently defined in `app.js`; change it before deploying a real store. The current client-side admin check is suitable for a demo only, not for production authentication.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Use the default settings for a static deployment.
4. Deploy. `vercel.json` maps `/` to `merocart.html`.

## Important Configuration

- Replace the WhatsApp number in `merocart.html` with the store's number.
- Replace the Supabase project credentials in `app.js` when using another project.
- Update the eSewa QR image and payment instructions when payment details change.
- Move admin authentication to a server-side system before using this for real customer data.
