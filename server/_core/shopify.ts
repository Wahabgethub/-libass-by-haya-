/**
 * Shopify Storefront API adapter.
 *
 * All Storefront access — catalog reads and cart reads/writes — goes through
 * this module. The Admin token is intentionally not used in app code; product
 * setup is performed once via the Shopify MCP tools.
 *
 * Layout follows the rest of `server/_core/*`:
 *   1. Transport (`storefrontFetch`) with TRPCError mapping
 *   2. GraphQL fragments (the contract for what we request)
 *   3. The eight capability functions, flat named exports:
 *      listProducts, getProductByHandle, listCollections,
 *      getCollectionByHandle, createCart, getCart,
 *      addCartLines, updateCartLines, removeCartLines
 *
 * Every function returns backend-agnostic `shared/commerce/types` via
 * `shopifyNormalize.ts` — the rest of the app never sees raw Shopify shapes.
 */

import { TRPCError } from "@trpc/server";
import type { Cart, Collection, Product } from "@shared/commerce/types";
import {
  type RawCart,
  type RawCollection,
  type RawProduct,
  normalizeCart,
  normalizeCollection,
  normalizeProduct,
} from "./shopifyNormalize";
import { addLocalCartLines, createLocalCart, getLocalCart, getLocalProductByHandle, listLocalProducts, removeLocalCartLines, setSupplementalLocalProducts, updateLocalCartLines } from "../localCommerce";
import { listProductMedia, listPublishedStudioSuits } from "../db";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Storefront API version pinned for the whole adapter.
 */
export const SHOPIFY_API_VERSION = "2025-04";

/** Lazy env access — tests can override `process.env` before each case. */
function getShopifyStoreDomain(): string {
  return process.env.SHOPIFY_STORE_DOMAIN ?? "";
}
function getShopifyStorefrontToken(): string {
  return process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ?? "";
}
export function isShopifyConfigured(): boolean {
  return Boolean(getShopifyStoreDomain() && getShopifyStorefrontToken());
}
function shopifyStorefrontEndpoint(): string {
  return `https://${getShopifyStoreDomain()}/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ShopifyUserError = {
  message: string;
  field?: string[] | null;
  code?: string | null;
};

async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!isShopifyConfigured()) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API is not configured",
    });
  }

  let response: Response;
  try {
    response = await fetch(shopifyStorefrontEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": getShopifyStorefrontToken(),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    console.error("[Shopify] Network error", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API is unreachable",
    });
  }

  if (!response.ok) {
    console.error(
      "[Shopify] HTTP",
      response.status,
      await response.text().catch(() => "")
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify Storefront API returned HTTP ${response.status}`,
    });
  }

  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length) {
    console.error("[Shopify] GraphQL errors", json.errors);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: json.errors[0].message || "Shopify Storefront API error",
    });
  }
  if (!json.data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API returned no data",
    });
  }
  return json.data;
}

/**
 * Convert a `{ cart, userErrors }` mutation payload into a normalized cart.
 *
 * `userErrors` are user-correctable (invalid variant, qty out of range, etc.)
 * and become `BAD_REQUEST`. A missing cart with no userErrors is a server bug
 * and becomes `INTERNAL_SERVER_ERROR`.
 */
function unwrapCart(
  payload: { cart: RawCart | null; userErrors: ShopifyUserError[] },
  context: string
): Cart {
  if (payload.userErrors && payload.userErrors.length) {
    console.error(`[Shopify] ${context} userErrors`, payload.userErrors);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: payload.userErrors[0].message || `Shopify ${context} failed`,
    });
  }
  if (!payload.cart) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify ${context} returned no cart`,
    });
  }
  return normalizeCart(payload.cart);
}

// ---------------------------------------------------------------------------
// GraphQL fragments — single source of truth for what we request.
// Two rules baked in here:
//   - Never include `quantityAvailable` (requires a scope we don't have →
//     ACCESS_DENIED). Use `availableForSale: boolean` instead.
//   - Pin the API version (env.ts), keep fragments aligned with normalize.ts.
// ---------------------------------------------------------------------------

const MONEY_FRAGMENT = /* GraphQL */ `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

const VARIANT_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    price { ...MoneyFields }
    compareAtPrice { ...MoneyFields }
    selectedOptions { name value }
  }
`;

const PRODUCT_FRAGMENT = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    productType
    vendor
    tags
    options { name values }
    priceRange {
      minVariantPrice { ...MoneyFields }
      maxVariantPrice { ...MoneyFields }
    }
    images(first: 8) {
      edges { node { ...ImageFields } }
    }
    variants(first: 25) {
      edges { node { ...VariantFields } }
    }
  }
`;

const COLLECTION_FRAGMENT = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  fragment CollectionFields on Collection {
    id
    handle
    title
    description
    image { ...ImageFields }
  }
`;

const CART_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      totalAmount { ...MoneyFields }
      subtotalAmount { ...MoneyFields }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost { totalAmount { ...MoneyFields } }
          merchandise {
            ... on ProductVariant {
              id
              title
              price { ...MoneyFields }
              product {
                handle
                title
                images(first: 1) {
                  edges { node { url altText width height } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

type Edges<T> = { edges: Array<{ node: T }> };
type ProductConnection = Edges<RawProduct> & { pageInfo: { hasNextPage: boolean; endCursor: string | null } };

export type ListProductsOptions = {
  first?: number;
  /** Optional handle of a collection to scope the listing to. */
  collectionHandle?: string;
};

const studioMoney = (amount: string) => ({ amount, currencyCode: "PKR" as const });
function slugPart(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x"; }
async function publishedStudioProducts(): Promise<Product[]> { return Promise.all((await listPublishedStudioSuits()).map(async suit => { const media = await listProductMedia(suit.productHandle); const validSalePrice = suit.salePrice && Number(suit.salePrice) > 0 && Number(suit.salePrice) < Number(suit.regularPrice) ? suit.salePrice : null; const price = validSalePrice ?? suit.regularPrice; const sizes = suit.sizes ?? []; const hasSizes = sizes.length > 0; const hasSubSizes = sizes.some(s => (s.subSizes ?? []).length > 0); const options = hasSizes ? (hasSubSizes ? [{ name: "Size", values: sizes.map(s => s.label) }, { name: "Measurement", values: Array.from(new Set(sizes.flatMap(s => (s.subSizes ?? []).map(sub => sub.label)))) }] : [{ name: "Size", values: sizes.map(s => s.label) }]) : [{ name: "Title", values: ["Default Title"] }]; const variants = hasSizes ? sizes.flatMap(s => { const subs = s.subSizes ?? []; if (subs.length > 0) return subs.map(sub => ({ id: `studio-${suit.productHandle}-${slugPart(s.label)}-${slugPart(sub.label)}`, title: `${s.label} / ${sub.label}`, price: studioMoney(price), compareAtPrice: validSalePrice ? studioMoney(suit.regularPrice) : null, availableForSale: s.available && sub.available && (sub.stock === null || sub.stock === undefined || sub.stock > 0), selectedOptions: [{ name: "Size", value: s.label }, { name: "Measurement", value: sub.label }] })); return [{ id: `studio-${suit.productHandle}-${slugPart(s.label)}`, title: s.label, price: studioMoney(price), compareAtPrice: validSalePrice ? studioMoney(suit.regularPrice) : null, availableForSale: s.available && (s.stock === null || s.stock === undefined || s.stock > 0), selectedOptions: [{ name: "Size", value: s.label }] }]; }) : [{ id: `studio-${suit.productHandle}-default`, title: "Default Title", price: studioMoney(price), compareAtPrice: validSalePrice ? studioMoney(suit.regularPrice) : null, availableForSale: suit.stock === null || suit.stock === undefined || suit.stock > 0, selectedOptions: [{ name: "Title", value: "Default Title" }] }]; return { id: `studio-product-${suit.id}`, handle: suit.productHandle, title: suit.title, description: suit.description, descriptionHtml: "", productType: suit.productType || "Unstitched", vendor: "Libaas by HAYA", tags: [(suit.productType || "Unstitched").toLowerCase(), "studio"], images: media.map(item => ({ url: item.imageUrl, altText: item.altText ?? item.title, viewLabel: item.viewLabel })), priceRange: { min: studioMoney(price), max: studioMoney(price) }, options, variants } satisfies Product; })); }
async function prepareStudioLocalProducts() { const products = await publishedStudioProducts(); setSupplementalLocalProducts(products); return products; }

export async function listProducts(
  options: ListProductsOptions = {}
): Promise<Product[]> {
  if (!isShopifyConfigured()) { const studio = await prepareStudioLocalProducts(); const local = listLocalProducts(1000); return [...local, ...studio.filter(item => !local.some(existing => existing.handle === item.handle))].slice(0, options.first ?? 24); }
  const target = Math.min(Math.max(options.first ?? 24, 1), 1000);
  const first = Math.min(target, 250);

  if (options.collectionHandle) {
    const data = await storefrontFetch<{
      collection: { products: ProductConnection } | null;
    }>(
      `${PRODUCT_FRAGMENT}
       query productsByCollection($handle: String!, $first: Int!) {
         collection(handle: $handle) {
           products(first: $first) {
             edges { node { ...ProductFields } }
           }
         }
       }`,
      { handle: options.collectionHandle, first }
    );
    if (!data.collection) return [];
    return data.collection.products.edges.slice(0, target).map(e => normalizeProduct(e.node));
  }

  const products: RawProduct[] = [];
  let after: string | null = null;
  do {
    const data: { products: ProductConnection } = await storefrontFetch<{ products: ProductConnection }>(
      `${PRODUCT_FRAGMENT}
       query listProducts($first: Int!, $after: String) {
         products(first: $first, after: $after, sortKey: TITLE) {
           edges { node { ...ProductFields } }
           pageInfo { hasNextPage endCursor }
         }
       }`,
      { first: Math.min(250, target - products.length), after }
    );
    products.push(...data.products.edges.map((edge: { node: RawProduct }) => edge.node));
    after = data.products.pageInfo?.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after && products.length < target);
  const studio = await publishedStudioProducts(); const shopify = products.slice(0, target).map(normalizeProduct); return [...shopify, ...studio.filter(item => !shopify.some(existing => existing.handle === item.handle))].slice(0, target);
}

export async function getProductByHandle(handle: string): Promise<Product> {
  const studio = (await prepareStudioLocalProducts()).find(item => item.handle === handle);
  if (studio) return studio;
  if (!isShopifyConfigured()) return getLocalProductByHandle(handle);
  const data = await storefrontFetch<{ productByHandle: RawProduct | null }>(
    `${PRODUCT_FRAGMENT}
     query productByHandle($handle: String!) {
       productByHandle(handle: $handle) { ...ProductFields }
     }`,
    { handle }
  );
  if (!data.productByHandle) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Product "${handle}" not found`,
    });
  }
  return normalizeProduct(data.productByHandle);
}

export async function listCollections(first: number = 10): Promise<Collection[]> {
  const data = await storefrontFetch<{ collections: Edges<RawCollection> }>(
    `${COLLECTION_FRAGMENT}
     query listCollections($first: Int!) {
       collections(first: $first) {
         edges { node { ...CollectionFields } }
       }
     }`,
    { first }
  );
  return data.collections.edges.map(e => normalizeCollection(e.node));
}

export async function getCollectionByHandle(handle: string): Promise<Collection> {
  const data = await storefrontFetch<{ collection: RawCollection | null }>(
    `${COLLECTION_FRAGMENT}
     query collectionByHandle($handle: String!) {
       collection(handle: $handle) { ...CollectionFields }
     }`,
    { handle }
  );
  if (!data.collection) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Collection "${handle}" not found`,
    });
  }
  return normalizeCollection(data.collection);
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export type CartLineInput = { variantId: string; quantity: number };
export type CartLineUpdate = { lineId: string; quantity: number };

type CartMutationResponse<K extends string> = Record<
  K,
  { cart: RawCart | null; userErrors: ShopifyUserError[] }
>;

export async function createCart(lines: CartLineInput[]): Promise<Cart> {
  if (lines.some(line => line.variantId.startsWith("studio-"))) { if (!lines.every(line => line.variantId.startsWith("studio-"))) throw new TRPCError({ code: "BAD_REQUEST", message: "Order Studio suits separately from Shopify catalog items." }); await prepareStudioLocalProducts(); return createLocalCart(lines); }
  if (!isShopifyConfigured()) return createLocalCart(lines);
  const data = await storefrontFetch<CartMutationResponse<"cartCreate">>(
    `${CART_FRAGMENT}
     mutation cartCreate($input: CartInput!) {
       cartCreate(input: $input) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      input: {
        lines: lines.map(l => ({ merchandiseId: l.variantId, quantity: l.quantity })),
      },
    }
  );
  return unwrapCart(data.cartCreate, "cartCreate");
}

export async function getCart(cartId: string): Promise<Cart | null> {
  if (cartId.startsWith("local-cart-")) return getLocalCart(cartId);
  if (!isShopifyConfigured()) return getLocalCart(cartId);
  const data = await storefrontFetch<{ cart: RawCart | null }>(
    `${CART_FRAGMENT}
     query getCart($cartId: ID!) {
       cart(id: $cartId) { ...CartFields }
     }`,
    { cartId }
  );
  return data.cart ? normalizeCart(data.cart) : null;
}

export async function addCartLines(
  cartId: string,
  lines: CartLineInput[]
): Promise<Cart> {
  if (cartId.startsWith("local-cart-")) { await prepareStudioLocalProducts(); return addLocalCartLines(cartId, lines); }
  if (!isShopifyConfigured()) return addLocalCartLines(cartId, lines);
  const data = await storefrontFetch<CartMutationResponse<"cartLinesAdd">>(
    `${CART_FRAGMENT}
     mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
       cartLinesAdd(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      cartId,
      lines: lines.map(l => ({ merchandiseId: l.variantId, quantity: l.quantity })),
    }
  );
  return unwrapCart(data.cartLinesAdd, "cartLinesAdd");
}

export async function updateCartLines(
  cartId: string,
  updates: CartLineUpdate[]
): Promise<Cart> {
  if (cartId.startsWith("local-cart-")) return updateLocalCartLines(cartId, updates);
  if (!isShopifyConfigured()) return updateLocalCartLines(cartId, updates);
  const data = await storefrontFetch<CartMutationResponse<"cartLinesUpdate">>(
    `${CART_FRAGMENT}
     mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
       cartLinesUpdate(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      cartId,
      lines: updates.map(u => ({ id: u.lineId, quantity: u.quantity })),
    }
  );
  return unwrapCart(data.cartLinesUpdate, "cartLinesUpdate");
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[]
): Promise<Cart> {
  if (cartId.startsWith("local-cart-")) return removeLocalCartLines(cartId, lineIds);
  if (!isShopifyConfigured()) return removeLocalCartLines(cartId, lineIds);
  const data = await storefrontFetch<CartMutationResponse<"cartLinesRemove">>(
    `${CART_FRAGMENT}
     mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
       cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    { cartId, lineIds }
  );
  return unwrapCart(data.cartLinesRemove, "cartLinesRemove");
}
