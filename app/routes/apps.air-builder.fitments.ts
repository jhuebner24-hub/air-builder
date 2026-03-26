import { authenticate } from "../shopify.server";

type FitmentRecord = {
  yearStart: number;
  yearEnd: number;
  make: string;
  model: string;
  drivetrain: string;
  frontSku: string;
  rearSku: string;
  managementSkus: string[];
  tankSkus: string[];
  addonSkus: string[];
};

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function parseCsv(value: string | null | undefined) {
  return (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function fieldsToObject(fields: Array<{ key: string; value: string | null }>) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.value || "";
    return acc;
  }, {});
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function loader({ request }: any) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "match";

  console.log("FITMENTS HIT", {
    url: request.url,
    mode,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  });

  try {
    const { admin } = await authenticate.public.appProxy(request);

    const response = await admin.graphql(`
      query AirRideFitments {
        shop {
          managementSkus: metafield(namespace: "air_builder", key: "management_skus") {
            value
          }
          tankSkus: metafield(namespace: "air_builder", key: "tank_skus") {
            value
          }
          addonSkus: metafield(namespace: "air_builder", key: "addon_skus") {
            value
          }
        }
        metaobjects(type: "air_ride_fitment", first: 250) {
          nodes {
            id
            handle
            fields {
              key
              value
            }
          }
        }
      }
    `);

    const gql = await response.json();
    const nodes = gql?.data?.metaobjects?.nodes || [];
    const shop = gql?.data?.shop || {};

    const settings = {
      managementSkus: parseCsv(shop?.managementSkus?.value),
      tankSkus: parseCsv(shop?.tankSkus?.value),
      addonSkus: parseCsv(shop?.addonSkus?.value),
    };

    const fitments: FitmentRecord[] = nodes
      .map((node: any) => {
        const f = fieldsToObject(node.fields || []);

        return {
          yearStart: Number(f.year_start || 0),
          yearEnd: Number(f.year_end || 0),
          make: f.make || "",
          model: f.model || "",
          drivetrain: f.drivetrain || "",
          frontSku: f.front_sku || "",
          rearSku: f.rear_sku || "",
          managementSkus: parseCsv(f.management_skus),
          tankSkus: parseCsv(f.tank_skus),
          addonSkus: parseCsv(f.addon_skus),
        };
      })
      .filter(
        (f) =>
          f.yearStart &&
          f.yearEnd &&
          f.make &&
          f.model &&
          f.drivetrain
      );

    if (mode === "list") {
      return jsonResponse({
        fitment: null,
        fitments: fitments.map((f) => ({
          yearStart: f.yearStart,
          yearEnd: f.yearEnd,
          make: f.make,
          model: f.model,
          drive: f.drivetrain,
        })),
        settings,
      });
    }

    const year = Number(url.searchParams.get("year") || "");
    const make = url.searchParams.get("make") || "";
    const model = url.searchParams.get("model") || "";
    const drivetrain = url.searchParams.get("drivetrain") || "";

    if (!year || !make || !model || !drivetrain) {
      return jsonResponse({ fitment: null, settings });
    }

    const match = fitments.find((f) => {
      return (
        year >= f.yearStart &&
        year <= f.yearEnd &&
        normalize(f.make) === normalize(make) &&
        normalize(f.model) === normalize(model) &&
        normalize(f.drivetrain) === normalize(drivetrain)
      );
    });

    if (!match) {
      return jsonResponse({ fitment: null, settings });
    }

    return jsonResponse({
      fitment: {
        frontSku: match.frontSku,
        rearSku: match.rearSku,
        managementSkus: match.managementSkus,
        tankSkus: match.tankSkus,
        addonSkus: match.addonSkus,
      },
      settings,
    });
  } catch (error: any) {
    console.error("apps.air-builder.fitments.ts error:", error);

    return jsonResponse({
      fitment: null,
      fitments: [],
      settings: {
        managementSkus: [],
        tankSkus: [],
        addonSkus: [],
      },
      error: error?.message || "Unknown app proxy error",
    });
  }
}