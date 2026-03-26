import { useNavigate } from "react-router";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>Air Builder Admin</h1>
      <p style={{ marginBottom: 16 }}>
        Manage fitments for your air ride builder.
      </p>

      <button
        onClick={() => navigate("/app/air-builder-fitments")}
        style={{
          padding: "12px 18px",
          borderRadius: "10px",
          border: "1px solid #111",
          background: "#111",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Manage Fitments
      </button>
    </div>
  );
}