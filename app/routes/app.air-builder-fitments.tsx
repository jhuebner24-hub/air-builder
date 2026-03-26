import { Form, useActionData, useLoaderData, data } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { useMemo, useState } from "react";

function fieldValueMap(fields: Array<{ key: string; value: string | null }>) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.value || "";
    return acc;
  }, {});
}

function makeHandle(input: {
  yearStart: string;
  yearEnd: string;
  make: string;
  model: string;
  drivetrain: string;
}) {
  return `${input.yearStart}-${input.yearEnd}-${input.make}-${input.model}-${input.drivetrain}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCsvRows(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return row;
  });

  return rows;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query AirRideFitmentsAdmin {
      metaobjectDefinitions(first: 50) {
        nodes {
          id
          type
          name
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

  const jsonData = await response.json();
  const definitions = jsonData?.data?.metaobjectDefinitions?.nodes || [];
  const fitments = jsonData?.data?.metaobjects?.nodes || [];

  const hasDefinition = definitions.some((d: any) => d.type === "air_ride_fitment");

  return data({
    hasDefinition,
    fitments: fitments.map((item: any) => ({
      id: item.id,
      handle: item.handle,
      fields: fieldValueMap(item.fields || []),
    })),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "create_definition") {
    const response = await admin.graphql(`
      mutation CreateAirRideFitmentDefinition {
        metaobjectDefinitionCreate(
          definition: {
            name: "Air Ride Fitment"
            type: "air_ride_fitment"
            fieldDefinitions: [
              { name: "Year Start", key: "year_start", type: "number_integer" }
              { name: "Year End", key: "year_end", type: "number_integer" }
              { name: "Make", key: "make", type: "single_line_text_field" }
              { name: "Model", key: "model", type: "single_line_text_field" }
              { name: "Drivetrain", key: "drivetrain", type: "single_line_text_field" }
              { name: "Front SKU", key: "front_sku", type: "single_line_text_field" }
              { name: "Rear SKU", key: "rear_sku", type: "single_line_text_field" }
              { name: "Management SKUs", key: "management_skus", type: "multi_line_text_field" }
              { name: "Tank SKUs", key: "tank_skus", type: "multi_line_text_field" }
              { name: "Addon SKUs", key: "addon_skus", type: "multi_line_text_field" }
            ]
          }
        ) {
          metaobjectDefinition {
            id
            name
            type
          }
          userErrors {
            field
            message
          }
        }
      }
    `);

    const result = await response.json();
    const payload = result?.data?.metaobjectDefinitionCreate;

    if (payload?.userErrors?.length) {
      return data({
        ok: false,
        message: payload.userErrors.map((e: any) => e.message).join(" | "),
      });
    }

    return data({
      ok: true,
      message: "Definition created.",
    });
  }

  if (intent === "create_fitment") {
    const yearStart = String(formData.get("yearStart") || "").trim();
    const yearEnd = String(formData.get("yearEnd") || "").trim();
    const make = String(formData.get("make") || "").trim();
    const model = String(formData.get("model") || "").trim();
    const drivetrain = String(formData.get("drivetrain") || "").trim();
    const frontSku = String(formData.get("frontSku") || "").trim();
    const rearSku = String(formData.get("rearSku") || "").trim();

    if (!yearStart || !yearEnd || !make || !model || !drivetrain || !frontSku || !rearSku) {
      return data({
        ok: false,
        message: "Fill in all fields before saving.",
      });
    }

    const handle = makeHandle({ yearStart, yearEnd, make, model, drivetrain });

    const response = await admin.graphql(
      `
      mutation CreateFitment($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
      `,
      {
        variables: {
          metaobject: {
            type: "air_ride_fitment",
            handle,
            fields: [
              { key: "year_start", value: yearStart },
              { key: "year_end", value: yearEnd },
              { key: "make", value: make },
              { key: "model", value: model },
              { key: "drivetrain", value: drivetrain },
              { key: "front_sku", value: frontSku },
              { key: "rear_sku", value: rearSku },
            ],
          },
        },
      },
    );

    const result = await response.json();
    const payload = result?.data?.metaobjectCreate;

    if (payload?.userErrors?.length) {
      return data({
        ok: false,
        message: payload.userErrors.map((e: any) => e.message).join(" | "),
      });
    }

    return data({
      ok: true,
      message: "Fitment created successfully.",
    });
  }

  if (intent === "bulk_import_fitments") {
    const csvText = String(formData.get("csvText") || "").trim();

    if (!csvText) {
      return data({
        ok: false,
        message: "Paste CSV data first.",
      });
    }

    const rows = parseCsvRows(csvText);

    if (!rows.length) {
      return data({
        ok: false,
        message: "No valid CSV rows found.",
      });
    }

    let created = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const yearStart = String(row.yearStart || "").trim();
      const yearEnd = String(row.yearEnd || "").trim();
      const make = String(row.make || "").trim();
      const model = String(row.model || "").trim();
      const drivetrain = String(row.drivetrain || "").trim();
      const frontSku = String(row.frontSku || "").trim();
      const rearSku = String(row.rearSku || "").trim();

      if (!yearStart || !yearEnd || !make || !model || !drivetrain || !frontSku || !rearSku) {
        errors.push(`Skipped row: ${JSON.stringify(row)}`);
        continue;
      }

      const handle = makeHandle({ yearStart, yearEnd, make, model, drivetrain });

      const response = await admin.graphql(
        `
        mutation CreateFitment($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject {
              id
              handle
            }
            userErrors {
              field
              message
            }
          }
        }
        `,
        {
          variables: {
            metaobject: {
              type: "air_ride_fitment",
              handle,
              fields: [
                { key: "year_start", value: yearStart },
                { key: "year_end", value: yearEnd },
                { key: "make", value: make },
                { key: "model", value: model },
                { key: "drivetrain", value: drivetrain },
                { key: "front_sku", value: frontSku },
                { key: "rear_sku", value: rearSku },
              ],
            },
          },
        },
      );

      const result = await response.json();
      const payload = result?.data?.metaobjectCreate;

      if (payload?.userErrors?.length) {
        errors.push(
          `${make} ${model} ${drivetrain}: ${payload.userErrors.map((e: any) => e.message).join(" | ")}`
        );
        continue;
      }

      created += 1;
    }

    return data({
      ok: errors.length === 0,
      message:
        errors.length === 0
          ? `Imported ${created} fitments successfully.`
          : `Imported ${created} fitments. Errors: ${errors.join(" || ")}`,
    });
  }

  if (intent === "update_fitment") {
    const id = String(formData.get("id") || "").trim();
    const yearStart = String(formData.get("yearStart") || "").trim();
    const yearEnd = String(formData.get("yearEnd") || "").trim();
    const make = String(formData.get("make") || "").trim();
    const model = String(formData.get("model") || "").trim();
    const drivetrain = String(formData.get("drivetrain") || "").trim();
    const frontSku = String(formData.get("frontSku") || "").trim();
    const rearSku = String(formData.get("rearSku") || "").trim();

    if (!id || !yearStart || !yearEnd || !make || !model || !drivetrain || !frontSku || !rearSku) {
      return data({
        ok: false,
        message: "Missing fields for update.",
      });
    }

    const response = await admin.graphql(
      `
      mutation UpdateFitment($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
      `,
      {
        variables: {
          id,
          metaobject: {
            fields: [
              { key: "year_start", value: yearStart },
              { key: "year_end", value: yearEnd },
              { key: "make", value: make },
              { key: "model", value: model },
              { key: "drivetrain", value: drivetrain },
              { key: "front_sku", value: frontSku },
              { key: "rear_sku", value: rearSku },
            ],
          },
        },
      },
    );

    const result = await response.json();
    const payload = result?.data?.metaobjectUpdate;

    if (payload?.userErrors?.length) {
      return data({
        ok: false,
        message: payload.userErrors.map((e: any) => e.message).join(" | "),
      });
    }

    return data({
      ok: true,
      message: "Fitment updated successfully.",
    });
  }

  if (intent === "delete_fitment") {
    const id = String(formData.get("id") || "").trim();

    if (!id) {
      return data({
        ok: false,
        message: "Missing fitment id.",
      });
    }

    const response = await admin.graphql(
      `
      mutation DeleteFitment($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
      `,
      {
        variables: { id },
      },
    );

    const result = await response.json();
    const payload = result?.data?.metaobjectDelete;

    if (payload?.userErrors?.length) {
      return data({
        ok: false,
        message: payload.userErrors.map((e: any) => e.message).join(" | "),
      });
    }

    return data({
      ok: true,
      message: "Fitment deleted successfully.",
    });
  }

  return data({ ok: false, message: "Unknown action." });
}

export default function AirBuilderFitmentsPage() {
  const { hasDefinition, fitments } = useLoaderData() as {
    hasDefinition: boolean;
    fitments: Array<{
      id: string;
      handle: string;
      fields: Record<string, string>;
    }>;
  };

  const actionData = useActionData() as
    | { ok: boolean; message: string }
    | undefined;

  const [search, setSearch] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [drivetrainFilter, setDrivetrainFilter] = useState("");

  const makes = useMemo(() => {
    return Array.from(new Set(fitments.map((f) => f.fields.make || "").filter(Boolean))).sort();
  }, [fitments]);

  const drivetrains = useMemo(() => {
    return Array.from(new Set(fitments.map((f) => f.fields.drivetrain || "").filter(Boolean))).sort();
  }, [fitments]);

  const filteredFitments = useMemo(() => {
    const q = search.trim().toLowerCase();

    return fitments.filter((fitment) => {
      const make = (fitment.fields.make || "").toLowerCase();
      const model = (fitment.fields.model || "").toLowerCase();
      const drivetrain = (fitment.fields.drivetrain || "").toLowerCase();
      const frontSku = (fitment.fields.front_sku || "").toLowerCase();
      const rearSku = (fitment.fields.rear_sku || "").toLowerCase();
      const years = `${fitment.fields.year_start || ""} ${fitment.fields.year_end || ""}`.toLowerCase();

      const matchesSearch =
        !q ||
        make.includes(q) ||
        model.includes(q) ||
        drivetrain.includes(q) ||
        frontSku.includes(q) ||
        rearSku.includes(q) ||
        years.includes(q);

      const matchesMake = !makeFilter || fitment.fields.make === makeFilter;
      const matchesDrive = !drivetrainFilter || fitment.fields.drivetrain === drivetrainFilter;

      return matchesSearch && matchesMake && matchesDrive;
    });
  }, [fitments, search, makeFilter, drivetrainFilter]);

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 12 }}>Air Builder Fitments</h1>
      <p style={{ marginBottom: 16 }}>
        Create, import, edit, delete, and filter front/rear fitment entries for the Air Builder.
      </p>

      {actionData ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${actionData.ok ? "#1f7a1f" : "#a33"}`,
            background: actionData.ok ? "#edf8ed" : "#fff1f1",
            color: "#111",
          }}
        >
          {actionData.message}
        </div>
      ) : null}

      {!hasDefinition ? (
        <Form method="post" style={{ marginBottom: 24 }}>
          <input type="hidden" name="intent" value="create_definition" />
          <button type="submit" style={{ padding: "12px 18px", borderRadius: "10px", border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
            Create Air Ride Fitment Definition
          </button>
        </Form>
      ) : (
        <>
          <div style={{ marginBottom: 24, color: "#333" }}>
            Definition exists. Use the forms below to add fitments.
          </div>

          <Form method="post" style={{ marginBottom: 28 }}>
            <input type="hidden" name="intent" value="create_fitment" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
              <input name="yearStart" placeholder="Year Start" />
              <input name="yearEnd" placeholder="Year End" />
              <input name="make" placeholder="Make" />
              <input name="model" placeholder="Model" />
              <input name="drivetrain" placeholder="Drivetrain" />
              <input name="frontSku" placeholder="Front SKU" />
              <input name="rearSku" placeholder="Rear SKU" />
            </div>
            <button type="submit" style={{ padding: "12px 18px", borderRadius: "10px", border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
              Save Fitment
            </button>
          </Form>

          <Form method="post" style={{ marginBottom: 28 }}>
            <input type="hidden" name="intent" value="bulk_import_fitments" />
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Bulk CSV Import</div>
            <textarea
              name="csvText"
              rows={10}
              placeholder={`yearStart,yearEnd,make,model,drivetrain,frontSku,rearSku
2015,2021,Subaru,STI,AWD,76016,76516
1989,2000,Lexus,LS400,RWD,76001,76501`}
              style={{ width: "100%", padding: 12, borderRadius: 10, marginBottom: 12 }}
            />
            <button type="submit" style={{ padding: "12px 18px", borderRadius: "10px", border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
              Import CSV
            </button>
          </Form>
        </>
      )}

      <h2 style={{ marginTop: 24, marginBottom: 12 }}>Current Fitments</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <input
          placeholder="Search make, model, drivetrain, year, or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={makeFilter} onChange={(e) => setMakeFilter(e.target.value)}>
          <option value="">All Makes</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </select>

        <select value={drivetrainFilter} onChange={(e) => setDrivetrainFilter(e.target.value)}>
          <option value="">All Drivetrains</option>
          {drivetrains.map((drive) => (
            <option key={drive} value={drive}>
              {drive}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12, color: "#555" }}>
        Showing {filteredFitments.length} of {fitments.length} fitments
      </div>

      {filteredFitments.length === 0 ? (
        <p>No fitments match your filters.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredFitments.map((fitment) => (
            <div key={fitment.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "#fff", color: "#111" }}>
              <Form method="post">
                <input type="hidden" name="intent" value="update_fitment" />
                <input type="hidden" name="id" value={fitment.id} />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
                  <input name="yearStart" defaultValue={fitment.fields.year_start || ""} />
                  <input name="yearEnd" defaultValue={fitment.fields.year_end || ""} />
                  <input name="make" defaultValue={fitment.fields.make || ""} />
                  <input name="model" defaultValue={fitment.fields.model || ""} />
                  <input name="drivetrain" defaultValue={fitment.fields.drivetrain || ""} />
                  <input name="frontSku" defaultValue={fitment.fields.front_sku || ""} />
                  <input name="rearSku" defaultValue={fitment.fields.rear_sku || ""} />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                    Update
                  </button>
                </div>
              </Form>

              <Form method="post" style={{ marginTop: 10 }}>
                <input type="hidden" name="intent" value="delete_fitment" />
                <input type="hidden" name="id" value={fitment.id} />
                <button type="submit" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #a33", background: "#a33", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                  Delete
                </button>
              </Form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}