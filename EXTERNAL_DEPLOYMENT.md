# Libaas by HAYA — Download and External Deployment Handoff

## Download the complete code

In the project interface, open the **More** menu and select **Download as ZIP**. Extract the ZIP, then run the project from its root directory with Node.js 22 or later and `pnpm` installed.

```bash
pnpm install
ADMIN_ACCESS_PASSWORD=choose-a-strong-private-passcode pnpm dev
```

The local server prints the localhost URL. The core storefront, Cash on Delivery checkout, protected Studio, local garment-image uploads, delivery rules, sales settings, product hiding, and local order records work in this configuration. The local store is kept in `data/libass-store.json`; uploaded garment files are kept in `data/uploads`.

## Important production constraint

> The current project is **local-first**. It intentionally writes orders, Studio settings, product visibility records, reviews, and garment files to the `data/` directory. A platform must provide persistent writable storage for this exact version to keep those records after restarts or redeploys.

| Route | Speed to launch | Works with the complete current store? | Practical outcome |
|---|---:|---:|---|
| Run locally on your own computer | Immediate | Yes, while the computer is running | Best zero-cost way to use every existing feature. |
| Vercel | Very fast for a frontend preview | No | Its serverless model is unsuitable for the project’s local JSON store and local uploads without a migration. |
| Render Free Web Service | Fast for a preview | No | Free services spin down after inactivity and lose local filesystem changes, including uploads and local data. |
| Railway Free | Fast for an experiment | No | Storage is ephemeral unless a persistent volume is used; free usage is limited. |
| External production deployment after migration | Moderate | Yes | Move data to a managed database and uploads to cloud object storage, then deploy the Node API and frontend. |

## Recommended free approach

For a **free, complete working version today**, download the code and run it locally. For a public online demo, Vercel or Render can be used only after accepting that the current locally stored Studio data and uploads cannot be relied upon.

For a **public store that keeps orders and uploads**, first migrate the local JSON store to a managed database and migrate `data/uploads` to object storage. After that, Vercel is a good fast frontend/serverless target; Render or Railway are alternatives for a conventional Node server.

## External-hosting environment variables

At minimum, set the following secret on any Node host:

```text
ADMIN_ACCESS_PASSWORD=your-private-studio-passcode
```

Use the following only when you intentionally need the linked remote services:

```text
SHOPIFY_STORE_DOMAIN=...
SHOPIFY_STOREFRONT_API_ACCESS_TOKEN=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Do not commit any of these values to GitHub. Configure them in the deployment platform’s secrets or environment-variable settings.

## Decision summary

The present codebase can be downloaded and run fully on localhost at no cost. There is no free external host that can safely preserve the current local file-based orders and uploads **as-is**. The migration to a managed database and cloud file storage is the required step before choosing Vercel, Render, Railway, or another public host for real customer use.

## References

[1]: https://render.com/docs/free "Render — Deploy for Free"
[2]: https://render.com/docs/disks "Render — Persistent Disks"
[3]: https://docs.railway.com/pricing/plans "Railway — Pricing Plans"
[4]: https://docs.railway.com/deployments/reference "Railway — Deployments Reference"
