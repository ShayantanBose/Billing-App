import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface ExpenseData {
  date: string;
  type: string;
  amount: string;
  imageUrl?: string;
  imageName?: string;
  uploadTime?: string;
  status?: string;
}

interface SheetsStatus {
  isReady: boolean;
  hasSheet: boolean;
  spreadsheetId?: string;
}

const AdminPanel: React.FC = () => {
  const [status, setStatus] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [sheetsStatus, setSheetsStatus] = useState<SheetsStatus>({
    isReady: false,
    hasSheet: false,
  });
  const [sheetsUrl, setSheetsUrl] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:3001/api/images")
      .then((res) => res.json())
      .then(setImages);
    fetch("http://localhost:3001/api/expenses")
      .then((res) => res.json())
      .then(setExpenses);
    fetch("http://localhost:3001/api/sheets/status")
      .then((res) => res.json())
      .then(setSheetsStatus);
    fetch("http://localhost:3001/api/sheets/url")
      .then((res) => res.json())
      .then((data) => setSheetsUrl(data.url))
      .catch(() => setSheetsUrl(""));
  }, []);

  const createNewSheet = async () => {
    setStatus("");
    try {
      const response = await fetch("http://localhost:3001/api/sheets/create", {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        setSheetsUrl(data.url);
        setSheetsStatus({
          ...sheetsStatus,
          hasSheet: true,
          spreadsheetId: data.spreadsheetId,
        });
        setStatus("Google Sheet created successfully!");
      } else {
        setStatus("Failed to create Google Sheet: " + data.message);
      }
    } catch {
      setStatus("Failed to create Google Sheet.");
    }
  };

  const handleClearData = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete all data? This cannot be undone."
      )
    )
      return;
    setStatus("Clearing data...");
    try {
      const res = await fetch("http://localhost:3001/api/sheets/clear", {
        method: "POST",
      });
      if (res.ok) {
        setStatus("All data cleared.");
        // Refresh data
        fetch("http://localhost:3001/api/expenses")
          .then((res) => res.json())
          .then(setExpenses);
        fetch("http://localhost:3001/api/images")
          .then((res) => res.json())
          .then(setImages);
      } else {
        setStatus("Failed to clear data.");
      }
    } catch {
      setStatus("Failed to clear data.");
    }
  };

  const handleClearDocImages = async () => {
    if (
      !window.confirm(
        "Remove all receipt images from the linked Google Doc? This cannot be undone."
      )
    ) {
      return;
    }

    setStatus("Removing images from Google Doc...");
    try {
      const res = await fetch("http://localhost:3001/api/docs/images/clear", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        const removed =
          typeof data.removedImages === "number" ? data.removedImages : 0;
        setStatus(
          `Removed ${removed} image${removed === 1 ? "" : "s"} from Google Doc.`
        );
      } else {
        setStatus(
          `Failed to remove images: ${data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error(error);
      setStatus("Failed to remove images from Google Doc.");
    }
  };

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "2rem auto",
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        position: "relative",
      }}
    >
      <h2>Admin Panel</h2>

      <Link
        to="/"
        style={{
          color: "#fff",
          textDecoration: "none",
          position: "absolute",
          right: 24,
          top: 24,
          background: "#1976d2",
          padding: "10px 18px",
          borderRadius: 6,
          fontWeight: 600,
          letterSpacing: 0.5,
          boxShadow: "0 2px 12px rgba(25, 118, 210, 0.35)",
          border: "1px solid rgba(0,0,0,0.05)",
          transition: "background 0.2s, transform 0.2s",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#1565c0";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#1976d2";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        Back to Main App
      </Link>

      {/* Google Sheets Status */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: sheetsStatus.isReady ? "#e8f5e8" : "#fff3cd",
          borderRadius: 8,
          border: `1px solid ${sheetsStatus.isReady ? "#4caf50" : "#ffc107"}`,
        }}
      >
        <h3
          style={{
            margin: "0 0 12px 0",
            color: sheetsStatus.isReady ? "#2e7d32" : "#856404",
          }}
        >
          Google Sheets Status
        </h3>
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>API Status:</strong>{" "}
          {sheetsStatus.isReady ? "✅ Connected" : "❌ Not Connected"}
        </p>
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>Sheet Status:</strong>{" "}
          {sheetsStatus.hasSheet ? "✅ Created" : "❌ Not Created"}
        </p>
        {sheetsUrl && (
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>Sheet URL:</strong>{" "}
            <a
              href={sheetsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1976d2", textDecoration: "underline" }}
            >
              Open Google Sheet
            </a>
          </p>
        )}
        {!sheetsStatus.hasSheet && sheetsStatus.isReady && (
          <button
            onClick={createNewSheet}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            Create New Google Sheet
          </button>
        )}
      </div>

      {status && (
        <p style={{ color: status.startsWith("Failed") ? "red" : "green" }}>
          {status}
        </p>
      )}

      <button
        onClick={handleClearData}
        style={{
          background: "#d32f2f",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          marginBottom: 16,
          fontWeight: 600,
        }}
      >
        Clear All Data
      </button>

      <button
        onClick={handleClearDocImages}
        style={{
          background: "#1565c0",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          marginBottom: 24,
          marginLeft: 12,
          fontWeight: 600,
          boxShadow: "0 2px 10px rgba(21,101,192,0.3)",
        }}
      >
        Remove Google Doc Images
      </button>

      <h3>Uploaded Images</h3>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 }}
      >
        {images.map((img) => (
          <img
            key={img}
            src={`http://localhost:3001/images/${img}`}
            alt={img}
            style={{
              width: 100,
              height: 100,
              objectFit: "cover",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        ))}
        {images.length === 0 && <p>No images uploaded yet.</p>}
      </div>

      <h3>Expense Entries</h3>
      <div
        style={{
          overflowX: "auto",
          borderRadius: 12,
          boxShadow: "0 4px 16px #0002",
          marginBottom: 32,
          background: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: 700,
            borderRadius: 12,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#222",
                color: "#fff",
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              <th
                style={{
                  padding: 14,
                  fontWeight: 700,
                  borderTopLeftRadius: 12,
                }}
              >
                Date
              </th>
              <th style={{ padding: 14, fontWeight: 700 }}>Type</th>
              <th style={{ padding: 14, fontWeight: 700 }}>Amount</th>
              <th style={{ padding: 14, fontWeight: 700 }}>Image</th>
              <th style={{ padding: 14, fontWeight: 700 }}>Upload Time</th>
              <th
                style={{
                  padding: 14,
                  fontWeight: 700,
                  borderTopRightRadius: 12,
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  background: idx % 2 === 0 ? "#f7fafd" : "#eef2f7",
                  transition: "background 0.2s",
                  cursor: "pointer",
                  borderBottom: "1px solid #e0e0e0",
                  color: "#222", // Ensure all table text is dark
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e3f2fd")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background =
                    idx % 2 === 0 ? "#f7fafd" : "#eef2f7")
                }
              >
                <td style={{ padding: 12, minWidth: 120, color: "#222" }}>
                  {row.date ? (
                    <span style={{ color: "#222" }}>
                      {new Date(row.date).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : (
                    <span style={{ color: "#888" }}>-</span>
                  )}
                </td>
                <td style={{ padding: 12, color: "#222" }}>
                  {row.type ? (
                    <span style={{ color: "#222" }}>{row.type}</span>
                  ) : (
                    <span style={{ color: "#888" }}>-</span>
                  )}
                </td>
                <td
                  style={{
                    padding: 12,
                    fontWeight: 600,
                    color: row.amount ? "#1976d2" : "#888",
                  }}
                >
                  {row.amount ? (
                    row.amount.startsWith("₹") ? (
                      row.amount
                    ) : (
                      `₹ ${row.amount}`
                    )
                  ) : (
                    <span style={{ color: "#888" }}>-</span>
                  )}
                </td>
                <td style={{ padding: 12 }}>
                  {row.imageUrl ? (
                    <a
                      href={row.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={row.imageUrl}
                        alt="Receipt"
                        style={{
                          width: 48,
                          height: 48,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #ccc",
                          boxShadow: "0 2px 8px #0001",
                        }}
                        title="Click to view full image"
                      />
                    </a>
                  ) : (
                    <span style={{ color: "#888" }}>-</span>
                  )}
                </td>
                <td style={{ padding: 12, minWidth: 120, color: "#222" }}>
                  {row.uploadTime ? (
                    <span style={{ color: "#222" }}>
                      {new Date(row.uploadTime).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : (
                    <span style={{ color: "#888" }}>-</span>
                  )}
                </td>
                <td style={{ padding: 12 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 16px",
                      borderRadius: 16,
                      background:
                        row.status === "Active" ? "#e3fbe3" : "#ffeaea",
                      color: row.status === "Active" ? "#1b5e20" : "#b71c1c",
                      fontWeight: 700,
                      fontSize: 15,
                      minWidth: 70,
                      textAlign: "center",
                      boxShadow:
                        row.status === "Active"
                          ? "0 1px 4px #b2dfdb"
                          : "0 1px 4px #ffcdd2",
                      letterSpacing: 0.5,
                    }}
                  >
                    {row.status || "Active"}
                  </span>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    padding: 36,
                    color: "#888",
                    fontSize: 18,
                    fontWeight: 500,
                    background: "#fff",
                  }}
                >
                  <span role="img" aria-label="empty">
                    🗂️
                  </span>{" "}
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
