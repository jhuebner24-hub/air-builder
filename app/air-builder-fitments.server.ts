import type { authenticate } from "./shopify.server";

type AdminGraphql = Awaited<ReturnType<typeof authenticate.admin>>["admin"]["graphql"];

type FitmentNode = {
  id: string;
  handle: string;
  fields: Array<{ key: string; value: string | null }>;
};

type FitmentPageResult = {
  data?: {
    metaobjects?: {
      nodes: FitmentNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: Array<{ message: string }>;
};

export async function loadAllFitments(graphql: AdminGraphql): Promise<FitmentNode[]> {
  const fitments: FitmentNode[] = [];
  let after: string | null = null;

  do {
    const response: Response = await graphql(
      `query AirRideFitmentPage($after: String) {
        metaobjects(type: "air_ride_fitment", first: 250, after: $after) {
          nodes { id handle fields { key value } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { variables: { after } },
    );
    const result: FitmentPageResult = await response.json();
    const page = result.data?.metaobjects;
    if (!response.ok || result.errors?.length || !page) {
      throw new Error(result.errors?.[0]?.message || "Could not load fitments from Shopify.");
    }
    fitments.push(...page.nodes);
    const next = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    if (page.pageInfo.hasNextPage && (!next || next === after)) {
      throw new Error("Shopify did not return a cursor for the next fitment page.");
    }
    after = next;
  } while (after);

  return fitments;
}
