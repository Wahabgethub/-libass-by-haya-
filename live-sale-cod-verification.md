# Live Sale and COD Verification

**Verification date:** 23 August 2026

The protected Studio pricing route applied the Azure Garden Three-Piece Suit sale at **PKR 4,499.00 regular** and **PKR 2,249.00 sale**. The same amounts were verified through the live product response and a live shopping-bag response.

One deliberately non-delivery Cash-on-Delivery test record was created through the application’s customer order route. It uses a clearly marked verification customer name and address, a reserved test email, a zero-like test phone number, and an initial `placed` fulfillment status. No payment collection or email delivery was attempted.

| Verified surface | Result |
|---|---|
| Live product response | Crossed-out PKR 4,499.00 and active PKR 2,249.00 price |
| Live cart response | Regular PKR 4,499.00, sale PKR 2,249.00, total PKR 2,249.00 |
| Customer receipt | Immutable regular PKR 4,499.00, sale PKR 2,249.00, unit and total PKR 2,249.00 |
| Protected admin record | Same immutable price snapshots and placed fulfillment status |

## Visible storefront confirmation

The live `/shop` page was opened after the Studio override. Its Azure Garden product card visibly showed a **-50%** label, the regular **PKR 4,499** amount, and the active **PKR 2,249** sale amount. The same browser session contained one suit in the shopping bag, ready for the checkout-summary visual check.

The live Azure Garden product page also visibly rendered the crossed-out **PKR 4,499**, active **PKR 2,249**, and **50% off** treatment. It retained the explicit three-piece, no-size-selection message and Cash-on-Delivery-only callout.

The browser’s pre-existing cart contained an unrelated Sandstone Abaya line, so the checkout-page visual session could not be used as evidence for the Azure Garden line without replacing that user-session cart. The live server cart route was queried directly and remained available; the Azure Garden verification cart previously returned the correct PKR 4,499 regular, PKR 2,249 sale, and PKR 2,249 total values before its test order was created.

The live customer receipt UI for the verification order was opened successfully. It visibly showed the clearly marked non-delivery contact information, **Cash on Delivery** status, the Azure Garden item at quantity 1, a **Sale applied** label, regular **PKR 4,499** crossed out beside **PKR 2,249 each**, and matching PKR 2,249 subtotal and total. No email was sent.

The protected Studio UI was opened with an existing administrator session. The verification order appears in its COD ledger with the expected test contact label, total PKR 2,249, and `Placed` status. The Studio’s integrated sales manager now appears before the page footer, lists Azure Garden as `SALE 2249.00`, and states that removal hides a product only from the Libaas public storefront while Shopify records and historical COD orders remain available.

The verification order’s Studio **Details** panel was opened. Its visible fixed-price line shows **Azure Garden Three-Piece Suit × 1**, **Regular PKR 4,499**, **Sale PKR 2,249**, and **Final PKR 2,249**, alongside the protected delivery data and editable fulfillment status.

For the remaining checkout visual check, an isolated browser-session cart containing one Azure Garden suit was created through the application’s existing cart route. It returned a PKR 2,249.00 total and did **not** create another order.

The live checkout UI was then opened after cart rehydration completed. It visibly rendered the Azure Garden order record at quantity 1, **Sale applied**, crossed-out **PKR 4,499**, active **PKR 2,249 each**, and PKR 2,249 subtotal and total. The customer form offered **Cash on Delivery only** and explicitly stated that no online payment or card information is collected.

The test order’s reference is retained only in the protected Studio ledger and should not be fulfilled.
