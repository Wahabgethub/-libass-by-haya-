# Validation Notes

## Live product page

The Shopify-backed product detail route for `sandstone-column-abaya` was verified in the browser on 2026-08-23. The page rendered the product image, 25% sale badge, compare-at and sale pricing, description, four selectable size variants (XS–L), add-to-bag control, and Shopify checkout statement after the initial live query completed.

## Visual check

The desktop storefront renders with the intended warm ivory, sandstone, and ink palette; editorial serif typography; responsive header; fashion-image-led home page; sale messaging; collection rail; and dark brand footer. The generated espresso image is still processing and currently appears as its reserved-generation placeholder in one collection tile; it will be replaced automatically when the image generation completes.

## Protected studio

The `/admin` screen was verified in the browser. Entering the configured passcode unlocked the signed studio workspace. The rendered workspace exposes the category-creation form, category image library, Cloudinary upload entry, and status cards without revealing Cloudinary API credentials in the browser.

## Live shop grid

The `/shop` route was verified after its connected-store request resolved. The published Sandstone Column Abaya appears with its Shopify-hosted image, sale badge, product type, compare-at price, sale price, and product-detail link.

## Live shopping bag

The selected XS product variant was added through the live Shopify-backed cart. The bag opened automatically and showed the correct product image, variant, quantity controls, PKR 165 subtotal, remove control, and secure-checkout handoff control.

## Studio and accessibility follow-up

The refreshed studio confirms that the Shopify sales-management handoff is visible and that uploaded Cloudinary images can be explicitly selected as a category cover once a category contains media. Cloudinary keys remain server-only and are never rendered into the workspace. A browser console check confirmed that the live stylesheet contains a `prefers-reduced-motion` media-query safeguard.

After the server restart, the live protected status procedure and studio UI both confirmed that Cloudinary is connected. The studio showed the connected state, no credentials were exposed, and the active category selector reached its ready state.

The reduced-motion browser override was explicitly activated and then cleared. The shopping-bag control’s computed transition duration dropped from `0.15s` to `0.00001s` while the override was active, confirming that interaction motion is suppressed by the same rules used for reduced-motion support.
