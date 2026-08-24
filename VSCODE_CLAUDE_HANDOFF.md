# LIBAAS by HAYA — Complete VS Code and Claude Implementation Guide

This is the **single handoff document** for the downloaded LIBAAS by HAYA project. Give this file to Claude before asking it to change anything. It records the full current product behavior, the requirements already implemented, the parts that must not be changed, and the safest way to request complete `cat` commands for VS Code.

> **Read this first.** This is a local-first full-stack project. Keep `data/libass-store.json` and `data/uploads/` when copying, backing up, or moving the project. They contain local Studio settings, published local suits, uploaded garment images, orders, sales, delivery rules, and reviews.

## 1. Open and run the downloaded project

Open the downloaded project folder in VS Code. Use **Terminal → New Terminal** and replace `/path/to/libass-by-haya` with the real folder path.

| Task | Copy-and-paste command |
|---|---|
| Enter the project | `cd /path/to/libass-by-haya` |
| Install dependencies | `pnpm install` |
| Add the Studio passcode for this terminal | `export ADMIN_ACCESS_PASSWORD='your-private-passcode'` |
| Check TypeScript | `pnpm check` |
| Run all tests | `pnpm test` |
| Run the website locally | `pnpm dev` |

For a reusable local Studio passcode, create a **local-only** `.env` file:

```bash
cat > .env <<'EOF'
ADMIN_ACCESS_PASSWORD=replace-with-a-private-passcode
EOF
```

Never commit `.env`, `data/libass-store.json`, or `data/uploads/` to a public repository.

## 2. Project architecture

| Layer | Technology | Purpose |
|---|---|---|
| Public storefront | React, Vite, Tailwind, Framer Motion, Wouter | Home, Shop, product pages, bag, COD checkout, receipt, review entry |
| Protected Studio | React and tRPC | Suit images, publishing, prices, sales, delivery, orders, reviews, motion media, filters |
| Server | Express, tRPC, Multer | Local APIs, access validation, multipart image upload, public catalog assembly |
| Local persistence | JSON under `data/` | Works after download without a hosted platform database |
| Garment media | `data/uploads/` | Locally stored front, back, detail, editorial, and motion images |
| Optional integrations | Shopify Storefront and Cloudinary | Shopify catalog can coexist with local published Studio suits; Cloudinary is only for separately managed category assets |

The public app starts from `client/src/main.tsx`. The server starts from `server/_core/index.ts`. The local store logic is in `server/db.ts`.

## 3. Brand and visual requirements

The name must be written **LIBAAS by HAYA** or **Libaas by HAYA**. Do not change it back to the older spelling. Keep the premium modest-fashion language: warm dark plum/charcoal, ivory text, antique-gold accents, small refined typography, soft fabric movement, and no neon/acid kinetic ticker.

The website has a mandatory cinematic home introduction. It is intentionally shown on a fresh home-page entry and includes one accessible **Enter the collection** action. Do not remove it, hide it with session storage, or add an escape action unless the owner asks explicitly. Keep reduced-motion support.

## 4. Customer storefront requirements

| Area | Required behavior |
|---|---|
| Shop | Shows published suits, regular price, optional crossed-out regular price when a valid lower sale price exists, and Quick Add where applicable. |
| Filters | Visitors can filter by **Color**, **Style**, and **Season**. The Studio owner enters those three labels in the protected **Visitor filters** panel. |
| Suit page | One main image is displayed at a time. Visitors click or horizontally scroll labeled **Front**, **Back**, **Detail**, and optional editorial thumbnails. |
| Three-piece suits | Do not show a size selector for three-piece suit products. |
| Bag and checkout | Cash on Delivery only. The receipt shows immutable regular price, active sale price, delivery fee, and total snapshots. |
| Reviews | Only an actual COD customer with a matching order number, email, and product can submit a review. Studio approval is required before public display. Never seed or invent reviews, ratings, orders, or testimonials. |
| Customer data | Email, phone, and delivery address are stored only for protected fulfillment workflow. Do not email receipts automatically unless the owner later explicitly requests an email integration. |

### Cash on Delivery rule

This project is strictly **Cash on Delivery**. Do not add credit cards, online bank transfer, IBAN details, manual bank transfer, Stripe, a Shopify checkout handoff, or payment collection fields unless the owner explicitly changes the policy.

## 5. How to create and publish a new suit in Studio

Open `/admin`, unlock Studio, and use the following sequence.

| Step | Studio action | Result |
|---:|---|---|
| 1 | **Create a suit** | Creates an isolated local Studio suit draft with a unique name and handle. |
| 2 | Upload one **Front** image | First required view is saved only to that suit. |
| 3 | Upload one **Back** image | Second required view is saved only to that suit. |
| 4 | Upload one **Detail** image | The suit becomes ready for publication. |
| 5 | Add up to three more views | Optional Editorial / Other images, for a maximum of six views total. |
| 6 | Use **Set price, then show the suit** | Enter title, description, regular price, and optional lower sale price. |
| 7 | **Publish to collection** | Makes the suit appear in Shop, product page, bag, and COD flow. |

### View order and image rules

The first three positions are protected:

| Position | Required view | Can be drag-reordered? |
|---:|---|---|
| 1 | Front | No |
| 2 | Back | No |
| 3 | Detail | No |
| 4–6 | Editorial / Other | Yes, in **Editorial order** |

Each image must be JPG, PNG, or WebP and at most 8 MB. Media never mixes across suits because every record uses one product handle. Do not weaken that isolation.

### Price rules

Enter the regular price in PKR. The sale price is optional. If a sale price is entered, it must be **greater than zero** and lower than the regular price. A blank sale price means the suit is sold at its regular price. Do not use `0` as a sale price.

## 6. Studio areas and their meaning

| Studio panel | Owner action | Safety rule |
|---|---|---|
| Suit gallery manager | Create suit drafts and upload Front/Back/Detail/extra garment views one at a time | Maximum six images; first three order is protected |
| Set price, then show the suit | Publish or update a local suit as a public product | Requires at least Front, Back, and Detail images |
| Editorial order | Drag views 4–6 into a new customer order | Never move Front/Back/Detail |
| Visitor filters | Set Color, Style, Season for public Shop filters | Does not change price, images, or COD records |
| Sales manager | Set regular/sale overrides for existing catalog products | Do not set a sale to zero or above regular price |
| Delivery manager | Set delivery fee or free-delivery threshold/rule | Changes new COD calculations; old receipts keep their snapshot |
| COD ledger | Browse up to 1,000 local order records | Customer data is private |
| Reviews | Publish or reject order-verified review submissions | No fabricated reviews |
| Cut to Move | Upload/order separate home-page motion images | Separate from every suit gallery |
| Cloudinary library | Manage recorded Cloudinary category assets | Delete only a named asset after explicit approval |

## 7. Deletion rules

There are two separate product actions.

| Action | What it does | What it must not do |
|---|---|---|
| **Remove from storefront** | Hides the named product from public Shop and its public direct route | Does not delete Shopify source data, local images, Cloudinary assets, or historic orders |
| **Delete product and managed media** | Hides the product and deletes its own attached local managed garment media after confirmation | Does not delete unrelated suits, category images, Cloudinary assets, Shopify source data, or historic COD records |

Never perform deletion because a user says “clean up” or “delete images” generally. Require the exact named product or exact named Cloudinary asset and explicit approval.

## 8. Local data and deployment rules

The complete downloaded project can run locally without a managed database. It needs Node.js 22+, `pnpm`, and `ADMIN_ACCESS_PASSWORD`. The local persistence model does not survive a typical serverless filesystem, so Vercel, Netlify, and AWS Lambda need a database and object-storage migration before they can safely host the full Studio/COD workflow.

For the current architecture, an AWS EC2 or Lightsail server with persistent disk is the appropriate external-hosting model. Read `AWS_EC2_DEPLOYMENT.md` and `EXTERNAL_DEPLOYMENT.md` before deploying. Back up both `data/libass-store.json` and `data/uploads/`.

## 9. Files Claude should read before changing code

| Purpose | Main files |
|---|---|
| App routes and global visual policy | `client/src/App.tsx`, `client/src/index.css`, `client/src/pages/Home.tsx` |
| Shop and product page | `client/src/pages/Shop.tsx`, `client/src/pages/ProductDetail.tsx` |
| Studio shell | `client/src/pages/Admin.tsx`, `client/src/components/useStudioPanelRoot.ts` |
| Suit images and publication | `ProductMediaManager.tsx`, `StudioSuitPublishManager.tsx`, `EditorialDragReorder.tsx` |
| Filters | `SuitFilterManager.tsx`, `client/src/pages/Shop.tsx` |
| Local store | `server/db.ts`, `server/localCommerce.ts`, `server/suitMediaRules.ts` |
| Public catalog and cart integration | `server/_core/shopify.ts`, `server/routers/commerce.ts`, `server/routers/orders.ts` |
| Protected Studio API | `server/routers/admin.ts`, `server/adminAuth.ts`, `server/_core/index.ts` |
| Verification history | `enhancement-verification.md`, `todo.md`, `LOCAL_SETUP.md` |

## 10. Mandatory engineering rules for Claude

Claude must follow these rules for every requested change:

1. Preserve **Cash on Delivery only**. Do not add cards, online payment, IBAN, bank transfer, or Shopify checkout.
2. Preserve local persistence in `data/libass-store.json` and `data/uploads/` unless the owner explicitly asks for a migration.
3. Do not invent customer orders, reviews, testimonials, ratings, customers, or payment records.
4. Do not delete a named product, image, Cloudinary asset, or COD record without explicit owner approval.
5. Keep suit media isolated by `productHandle`.
6. Keep Front, Back, and Detail as the required first three views. Only extra editorial views can be drag-reordered.
7. Keep a maximum of six views per suit.
8. Keep local Studio suits unpublished until the owner has supplied three required images, title, description, and regular price.
9. Preserve historic order price and delivery snapshots after later sales or delivery changes.
10. Maintain accessibility, mobile layouts, keyboard controls, reduced-motion support, and visible focus states.
11. Run `pnpm check` and `pnpm test` after each code change.
12. Do not overwrite or delete `data/` when changing source code.

## 11. Ready-to-use Claude prompt for new requirements

Copy this entire prompt into Claude with your new requirement at the end.

```text
I have a downloaded full-stack React/Vite + Express/tRPC project named LIBAAS by HAYA.

Before changing code, read these files in this order:
1. VSCODE_CLAUDE_HANDOFF.md
2. LOCAL_SETUP.md
3. enhancement-verification.md
4. todo.md
5. package.json

Hard requirements:
- Keep Cash on Delivery only. Do not add cards, Stripe, IBAN, bank transfer, or Shopify checkout.
- Keep local state in data/libass-store.json and garment uploads in data/uploads.
- Never create fake customer reviews, ratings, testimonials, orders, or payments.
- Do not delete a product, image, Cloudinary asset, or COD history unless I explicitly name it and approve the deletion.
- Keep each suit gallery isolated by productHandle.
- A suit uses Front, Back, Detail as the first three views; only optional editorial views 4–6 can be reordered.
- Keep the max six images per suit limit.
- Keep the mandatory LIBAAS by HAYA cinematic entry, luxurious plum/charcoal/ivory/antique-gold visual style, and reduced-motion support.
- Run pnpm check and pnpm test after editing.

First tell me: (a) the exact files you will change, (b) why, and (c) any risk to local data.
Then wait for my confirmation before writing code.

My new requirement is:
[WRITE THE REQUIREMENT HERE]
```

## 12. Prompt for complete `cat` commands only

Use this when you need Claude to give full replacement-file commands for VS Code. Do not use it until Claude has first listed the files and you have backed up the project.

```text
Give me only complete Bash commands for my LIBAAS by HAYA project.

For every changed file, use this exact format:

cat > relative/path/to/file.tsx <<'EOF'
[ENTIRE FILE CONTENT HERE]
EOF

Rules:
- Give the entire file, not a partial snippet or ellipsis.
- Do not include placeholders.
- Do not use rm -rf, git reset --hard, or commands that delete data/.
- Do not overwrite data/libass-store.json or data/uploads/.
- After all file commands, give exactly these verification commands:
pnpm check
pnpm test
pnpm dev

The requested feature is:
[WRITE THE REQUIREMENT HERE]
```

## 13. Backup and rollback commands

Run this before allowing Claude to replace any source file:

```bash
cd /path/to/libass-by-haya
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "../libaas-backups/$STAMP"
cp -a client server shared data package.json pnpm-lock.yaml "../libaas-backups/$STAMP/"
echo "Backup saved at ../libaas-backups/$STAMP"
```

If a future change breaks the app, restore source files from the most recent backup, then run:

```bash
pnpm check
pnpm test
pnpm dev
```

Do not manually edit the JSON order history to “fix” a code issue. Restore the source code first.

## 14. Validation checklist after every change

| Check | Command or action |
|---|---|
| Type safety | `pnpm check` |
| Automated tests | `pnpm test` |
| Public page | Open `/`, `/shop`, and one public `/products/<handle>` route |
| Studio | Unlock `/admin`, confirm panels appear without overlap or multi-error toast |
| Suit workflow | Confirm Front → Back → Detail upload sequence and at most six total views |
| Publishing | Confirm a published suit shows its regular price and only a valid lower sale price |
| COD | Confirm bag/checkout/receipt still display delivery and total correctly |
| Data | Confirm `data/libass-store.json` and `data/uploads/` remain present |

The owner can now provide this file to Claude as the authoritative explanation of the project before requesting any further implementation.
