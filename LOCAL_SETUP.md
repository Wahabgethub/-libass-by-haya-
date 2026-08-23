# Run Libaas by HAYA Locally

This project does **not** require a hosted database, a `DATABASE_URL`, or a Manus project database to run its core workflows. When you start it locally, the application creates a writable `data/libass-store.json` file and a `data/uploads/` folder beside the source code. That local store holds Studio settings, sales overrides, product-view metadata, delivery rules, verified reviews, COD orders, and customer order details.

| Requirement | Local value | Purpose |
|---|---|---|
| Node.js | 22 or later | Runs the Vite and Express application. |
| Package manager | `pnpm` | Installs and runs project dependencies. |
| `ADMIN_ACCESS_PASSWORD` | Your private passcode | Unlocks the protected Studio locally. |
| `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_API_ACCESS_TOKEN` | Optional | Uses the live Shopify catalog and cart when present. |
| Cloudinary variables | Optional | Retains the older category-cover upload workflow only. The garment front/back/detail manager works without them. |

## Start locally

Create a local environment file with a Studio passcode. Do not commit this file.

```bash
ADMIN_ACCESS_PASSWORD=choose-a-strong-private-passcode
```

Install dependencies and run the local server.

```bash
pnpm install
pnpm dev
```

Open the local URL printed in the terminal, normally `http://localhost:3000`.

> If Shopify credentials are not supplied, Libaas automatically uses its bundled local Azure Garden and Sandstone catalog plus a local in-memory bag. This lets the storefront, bag, COD workflow, Studio delivery settings, product-media assignments, and review flow run locally. Shopify credentials are optional only when you want the current remote catalog and Shopify cart synchronization.

## Local data and media

The first successful write creates these runtime files:

```text
data/
├── libass-store.json     # Local Studio, COD order, review, delivery and sale records
└── uploads/              # Garment front/back/detail files added in Studio
```

The `data/` contents are ignored by source control because they may contain private customer information. Back up this folder before moving or deleting a local installation. To start fresh, stop the server and remove `data/libass-store.json` and any unwanted files in `data/uploads/`.

## Production note

The local JSON store is designed for a downloaded, single-owner localhost setup. A public deployment that receives simultaneous orders should use a production-grade shared data store and an authenticated media service; that is a separate hosting decision and is not required for local use.
