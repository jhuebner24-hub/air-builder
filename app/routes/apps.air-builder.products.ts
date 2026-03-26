import { data } from "react-router";
import { authenticate } from "../shopify.server";

type ProductLookupResult = {
  sku: string;
  title: string;
  image: string;
  handle: string;
  variantId: string;
  category: string;
};

function normalizeVariantId(id: string | null | undefined) {
  if (!id) return "";
  const match = String(id).match(/ProductVariant\/(\d+)$/);
  return match ? match[1] : String(id);
}

export async function loader({ request }: any) {
  try {
    const url = new URL(request.url);
    const skusParam = url.searchParams.get("skus") || "";

    const skus = skusParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!skus.length) {
      return data({ products: [] });
    }

    const { admin } = await authenticate.public.appProxy(request);

    const products: ProductLookupResult[] = [];

    for (const sku of skus) {
      const response = await admin.graphql(
        `
        query ProductVariantBySku($query: String!) {
          productVariants(first: 1, query: $query) {
            nodes {
              id
              sku
              title
              product {
                title
                handle
              }
            }
          }
        }
        `,
        {
          variables: {
            query: `sku:${sku}`,
          },
        },
      );

      const json = await response.json();
      const variant = json?.data?.productVariants?.nodes?.[0] || null;

      if (variant) {
        products.push({
          sku,
          title: variant.product?.title || variant.title || sku,
          image: "",
          handle: variant.product?.handle || "",
          variantId: normalizeVariantId(variant.id),
          category: "",
        });
      } else {
        products.push({
          sku,
          title: sku,
          image: "",
          handle: "",
          variantId: "",
          category: "",
        });
      }
    }

    return data({ products });
  } catch (error: any) {
    console.error("apps.air-builder.products.ts error:", error);

    return data({
      products: [],
      error: error?.message || "Unknown products route error",
    });
  }
}