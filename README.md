# Shop ERP

Stock, market purchases and imports (with landed cost), sales and invoices, customer credit, supplier balances, expenses and profit reports for an appliance and plumbing shop.

- Runs in any browser, on phone or computer. Can be added to the home screen like an app.
- Keeps working without internet. Sales, payments and expenses are saved on the device and upload on their own when the connection returns.
- Data lives in the shop's own Firebase project (Google). Free at this shop's size.
- Hosted free on GitHub Pages.

## Files

| File | What it is |
|---|---|
| `index.html` | Page layout and styles |
| `app.js` | All screens and business logic |
| `config.js` | The shop's Firebase settings and the owner's email |
| `firestore.rules` | Who may read and write the data (paste into Firebase) |
| `sw.js` | Keeps the app's files on the device so it opens offline |
| `vendor/firebase.js` | Firebase library, bundled (version 12.19.0) |
| `manifest.webmanifest`, `icons/` | Home-screen app name and icon |

## One-time setup

1. **Firebase project** (on the owner's Google account): create a project at console.firebase.google.com.
2. **Database**: Firestore → Create database → Standard edition → `europe-west1` → production mode.
3. **Sign-in**: Authentication → Sign-in method → enable **Google** and **Email/Password**.
4. **Web app**: Project settings → Your apps → `</>` → register. Copy `firebaseConfig` into `config.js`, and set `ownerEmail`.
5. **Rules**: Firestore → Rules → paste `firestore.rules`, replace `OWNER_EMAIL` with the owner's email in lowercase → Publish.
6. **Hosting**: push this folder to a GitHub repository → Settings → Pages → deploy from the `main` branch, root folder. The app's address will be `https://<user>.github.io/<repo>/`.
7. **Allow the address for Google sign-in**: Firebase → Authentication → Settings → Authorized domains → add `<user>.github.io`.

## Old debts (from before the app)

Customers & credit → **Enter old debts** (owners): one row per customer with the amount still owed, an optional note (e.g. the paper invoice number) and the date it was owed as of. A name that matches an existing customer adds the debt to them; otherwise a new customer is created. Old debts add to what the customer owes, are not sales, are not counted in profit and don't change any money account. Payments settle the oldest debt first. A single old debt can also be added from a customer's page.

The same exists for **suppliers**: Suppliers → **Enter old debts** (owners), with a currency per row (GNF, or USD with its rate). Old supplier debts add to what you owe, are not purchases, add nothing to stock and don't change any account. They're paid from the supplier's page ("Pay this supplier" lists old debts first, then unpaid purchases), from any account including dollars at the debt's own rate.

## Money accounts

Owners see **Money accounts**: the cash box, Orange Money, MTN MoMo, the bank, the home safe and US dollars, each with its balance and statement. Every sale, customer payment, expense and supplier payment says which account the money went into or came out of. Use **Transfer** to move money between accounts (buying dollars records the rate; fees count as expenses), **Owner money** for money the owner takes out or puts in (not an expense), and **Count cash** at closing (a difference is recorded and the balance set to the count). Staff choose the account when they sell but don't see this page or the home safe.

Purchases: a new purchase is **Paid in full** from the chosen account by default; switch to **Part paid** (type the amount) or **Not paid yet**. Each extra cost (freight, customs, transport…) has its own **Paid from** account or **Not paid yet**. Opening an older purchase shows what is still owed and a **Record a payment** form with that amount filled in, an account and a date.

## Invoices

The default design is **simple, black only** (thin lines, no colored areas) to save ink. Shop settings → Invoice details → **Invoice design** can switch to the blue design that copies the paper book. Invoices follow the shop's paper invoice book, in French: shop name, activities line, address, phone band and email; FACTURE N° and "Conakry, le"; client name, address and phone; the N° · DÉSIGNATIONS · Qté · P. UNITAIRE · Prix Total table (brand and model under each item); TOTAL; Payé and Reste à payer; the amount in French words; Le Gérant, the NB note and Le Client. **Print** produces one A4 page (or a PDF named after the invoice). All header details and the starting invoice number are in Shop settings → Invoice details; empty fields fall back to the details from the paper book. Numbers are the seller's letter plus six digits (A-000362).

## Dollar rate

The rate is entered by hand, once a day, by an owner. Until today's rate is saved, owners see a reminder at the top of every screen. The current rate shows in the menu (and as `$ 8,700` in the phone's top bar); tapping it opens the rate history. New imports in USD, buying dollars and dollar payments to suppliers start from the current rate and can still be changed on each record. Past records keep the rate they were saved with. A rate more than 20% away from the last one asks to be confirmed.

## Adding staff

The owner opens **Team**, adds the person's email and an invoice letter (B, C, …), and sends them the app link. They sign in with Google, or create an account with that email and confirm the link that is emailed to them. Removing someone in Team cuts their access immediately; their past sales stay.

Each person's invoices carry their own letter (F-A-00012, F-B-00003), so two phones selling offline at the same time never produce the same number.

## How offline works

- The app's files are kept on the device by `sw.js`. After the first visit it opens without internet.
- Firestore keeps a copy of all records on the device. Changes made offline are queued and uploaded when the connection returns, even if the app was closed in between.
- The status line at the bottom of the menu says **Online · all changes saved**, **Uploading changes…** or **Offline**.
- Signing in needs internet the first time on each device.

## Free limits

Firebase's free plan allows 50,000 reads and 20,000 writes per day. The app loads records from the device first and asks the server only for what changed since the last visit, so normal use stays far below the limit. A brand-new device downloads everything once.

## Backups

Shop settings → **Full backup (.json)**, **Sales lines (.csv)**, **Stock list (.csv)**. Firebase keeps the data safe online; a monthly backup on a computer is a good extra copy.

## Updating the app

Change the files, push to GitHub, and Pages publishes the new version in a minute or two. Phones pick it up the next time the app opens with internet. If you change `sw.js`, bump `CACHE` (for example `shop-erp-v2`).

## Data model (for future work)

Every record is one Firestore document with `updatedAt` set by the server; deletes are soft (`deleted: true`), so devices can fetch only changes.

| Collection | One document per | Key fields |
|---|---|---|
| `config/settings` | — | shopName, address, phone, prefix, footer |
| `members/{email}` | team member | name, code (invoice letter), role, active |
| `products` | product | name, sku, category, brand, unit, price, cost, min, active |
| `customers`, `suppliers` | person or company | name, phone, … |
| `purchases` | purchase or import | date, supplierId, kind, currency, rate, status, lines[], extras[{label, amount, accountId}], payments{amount, accountId, fxAmount, rate, date} |
| `adjustments` | stock correction | date, productId, qty (+/−), unitCost, reason |
| `sales` | invoice | no, series, date, customerId, items[{productId, brand, sku, qty, price, cost}], discount, paid, accountId, method, void |
| `payments` | customer payment | date, customerId, amount, accountId, method, void |
| `expenses` | expense | date, category, amount, accountId, method, void |
| `accounts` | place money is kept | name, type (cash, safe, mobile, bank), currency (GNF or USD), opening, openingDate, active |
| `transfers` | money moved between accounts | date, from, to, amount, toAmount, rate, fee, void |
| `equity` | owner money in or out | date, kind (in/out), accountId, amount, void |
| `cashcounts` | end-of-day count | date, accountId, expected, counted, diff |
| `rates/{YYYY-MM-DD}` | day's dollar rate | date, rate (GNF for 1 USD), by |
| `debts` | customer debt from before the app | customerId, amount, date, note, void |
| `supdebts` | debt to a supplier from before the app | supplierId, amount (GNF), currency, fxAmount, rate, date, note, payments{}, void |

Stock, average landed cost, customer and supplier balances, account balances and profit are calculated in the app from these records. An account's balance is its opening amount plus every movement dated on or after its start date; records made before accounts existed are matched to an account by their payment method. Transfer fees and cash-count differences are counted as expenses; owner money in or out is not. Double-entry accounting can later be generated from the same records (each sale, purchase, payment and expense becomes a journal entry).
