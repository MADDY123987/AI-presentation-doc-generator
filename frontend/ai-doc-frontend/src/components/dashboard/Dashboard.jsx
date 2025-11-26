// src/components/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import "./dashboard.css";
import { BASE_URL, AUTH_BASE_URL } from "../../config";


// Use Render backend everywhere (no localhost)
// BASE_URL already includes /api/v1
const API_BASE = BASE_URL;          // -> https://.../api/v1
const API_HOST = AUTH_BASE_URL;     // -> https://... (without /api/v1)


function Dashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", body: "" });
  const [modalLoading, setModalLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ---------- secure download helper (uses auth token) ----------
  const handleDownload = async (url, filenameFallback = "file") => {
    try {
      const headers = getAuthHeaders();

      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.error("Download failed:", res.status, await res.text());
        alert(`Download failed: ${res.status}`);
        return;
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filenameFallback;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download error: " + (err.message || "Unknown error"));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const headers = {
        Accept: "application/json",
        ...getAuthHeaders(),
      };

      try {
        const res = await fetch(`${API_BASE}/dashboard/items`, {
          headers,
        });

        const data = await res.json();
        if (!res.ok) {
          console.error("Dashboard API error:", res.status, data);
          setError(
            data.detail || `Backend error: ${res.status} ${res.statusText}`
          );
          setItems(null);
        } else {
          setItems(data);
        }
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatDate = (value) => {
    if (!value) return "no date";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value);
    }
  };

  const makePreviewText = (item) => {
    const MAX_CHARS = 280;
    if (!item) return "";

    if (item.summary && String(item.summary).trim())
      return String(item.summary).trim();
    if (item.preview && String(item.preview).trim())
      return String(item.preview).trim();

    const content = item.content || item.full_content || item.full_text;
    try {
      if (Array.isArray(content) && content.length > 0) {
        const first = content[0];
        if (first) {
          if (typeof first === "string" && first.trim()) {
            const s = first.trim();
            return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + "…" : s;
          }
          if (typeof first === "object") {
            const t = (first.title || first.heading || "").toString().trim();
            if (t)
              return t.length > MAX_CHARS ? t.slice(0, MAX_CHARS) + "…" : t;
            const bullets = first.bullets || first.points || first.body || [];
            if (Array.isArray(bullets) && bullets.length > 0) {
              const b0 = String(bullets[0]).trim();
              if (b0)
                return b0.length > MAX_CHARS ? b0.slice(0, MAX_CHARS) + "…" : b0;
            }
            const textFields = ["description", "text", "content", "summary"];
            for (const k of textFields) {
              if (first[k] && String(first[k]).trim()) {
                const s = String(first[k]).trim();
                return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + "…" : s;
              }
            }
          }
        }
      } else if (typeof content === "string" && content.trim()) {
        const s = content.trim();
        return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + "…" : s;
      }
    } catch (e) {
      console.warn("makePreviewText parsing error:", e);
    }

    const candidate = (item.title || item.topic || item.name || "")
      .toString()
      .trim();
    if (candidate)
      return candidate.length > MAX_CHARS
        ? candidate.slice(0, MAX_CHARS) + "…"
        : candidate;

    return `Item #${item.id || "?"}`;
  };

  const openReadMore = async (item, type = "presentation") => {
    setModalLoading(true);
    setModalOpen(true);
    setModalContent({ title: "Loading…", body: "" });

    if (item.full_text || item.full_content || item.content) {
      const body = item.full_text || item.full_content || item.content;
      setModalContent({
        title: item.title || item.topic || `${type} #${item.id}`,
        body: typeof body === "string" ? body : JSON.stringify(body, null, 2),
      });
      setModalLoading(false);
      return;
    }

    try {
      const endpoint =
        type === "presentation"
          ? `${API_BASE}/presentations/${item.id}`
          : `${API_BASE}/documents/${item.id}`;

      const res = await fetch(endpoint, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Read more fetch failed:", res.status, data);
        setModalContent({
          title: "Failed to load",
          body: data.detail || `Error ${res.status}`,
        });
      } else {
        if (type === "presentation") {
          const slides = data.content || [];
          const bodyText = slides
            .map((s, i) => {
              const t = s?.title ? `Title: ${s.title}` : "";
              const bullets =
                s?.bullets && s.bullets.length
                  ? `\n• ${s.bullets.join("\n• ")}`
                  : "";
              const left = s?.left ? `\nLeft: ${s.left}` : "";
              const right = s?.right ? `\nRight: ${s.right}` : "";
              return `Slide ${i + 1}\n${t}${bullets}${left}${right}`;
            })
            .join("\n\n");
          setModalContent({
            title:
              data.topic ||
              data.title ||
              `Presentation ${data.presentation_id || item.id}`,
            body: bodyText || JSON.stringify(data.content || data, null, 2),
          });
        } else {
          if (data.sections && Array.isArray(data.sections)) {
            const bodyText = data.sections
              .map(
                (s, i) =>
                  `Section ${i + 1} — ${s.title || ""}\n\n${
                    s.content || s.body || ""
                  }`
              )
              .join("\n\n----\n\n");
            setModalContent({
              title: data.title || item.title || `Document ${item.id}`,
              body: bodyText || JSON.stringify(data, null, 2),
            });
          } else {
            setModalContent({
              title: data.title || item.title || `Document ${item.id}`,
              body:
                data.content || data.body || JSON.stringify(data, null, 2),
            });
          }
        }
      }
    } catch (err) {
      console.error("Read more fetch error:", err);
      setModalContent({
        title: "Error",
        body: err.message || "Unknown error",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalContent({ title: "", body: "" });
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <p className="dashboard-status">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <p className="dashboard-status dashboard-status-error">
          Error loading data: {error}
        </p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="dashboard-page">
        <p className="dashboard-empty">
          No data found yet. Try creating a PPT or Word document first.
        </p>
      </div>
    );
  }

  const presentations = items.presentations || [];
  const documents = items.projects || items.documents || [];
  const allEmpty = presentations.length === 0 && documents.length === 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title-main">
          Welcome, {user?.email || "User"}
        </h1>
        <p className="dashboard-subtitle">
          Quick view of your AI-generated decks and documents.
        </p>
      </header>

      {allEmpty && (
        <div className="dashboard-empty">
          <p>No projects yet.</p>
          <p className="dashboard-empty-sub">
            Generate your first PPT or Word document from the top navigation,
            and it will appear here automatically.
          </p>
        </div>
      )}

      {!allEmpty && (
        <>
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2>Recent Presentations</h2>
              <span className="dashboard-count">
                {presentations.length} total
              </span>
            </div>

            {presentations.length === 0 ? (
              <p className="dashboard-section-empty">
                No presentations yet.
              </p>
            ) : (
              <div className="dashboard-grid">
                {presentations.map((p) => {
                  const previewText = makePreviewText(p);
                  const downloadUrl =
                    p.download_endpoint &&
                    (p.download_endpoint.startsWith("http")
                      ? p.download_endpoint
                      : `${API_HOST}${p.download_endpoint}`);

                  return (
                    <article className="dashboard-card" key={p.id}>
                      <div className="dashboard-card-top">
                        <span className="dashboard-type-pill">PPT</span>
                        <span className="dashboard-type">Presentation</span>
                      </div>

                      <h3 className="dashboard-card-title">
                        {p.title || p.topic || "Untitled deck"}
                      </h3>

                      <div className="dashboard-card-desc">
                        {previewText}
                      </div>

                      <p className="dashboard-date">
                        Created: {formatDate(p.created_at)}
                      </p>

                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          className="dashboard-open-btn"
                          onClick={() => openReadMore(p, "presentation")}
                        >
                          Read more
                        </button>

                        {downloadUrl ? (
                          <button
                            className="dashboard-open-btn"
                            onClick={() =>
                              handleDownload(
                                downloadUrl,
                                `${p.title || p.topic || "presentation"}.pptx`
                              )
                            }
                          >
                            Download PPTX
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2>Recent Documents</h2>
              <span className="dashboard-count">
                {documents.length} total
              </span>
            </div>

            {documents.length === 0 ? (
              <p className="dashboard-section-empty">
                No documents yet.
              </p>
            ) : (
              <div className="dashboard-grid">
                {documents.map((d) => {
                  const previewText = makePreviewText(d);
                  const downloadUrl =
                    d.download_endpoint &&
                    (d.download_endpoint.startsWith("http")
                      ? d.download_endpoint
                      : `${API_HOST}${d.download_endpoint}`);
                  return (
                    <article className="dashboard-card" key={d.id}>
                      <div className="dashboard-card-top">
                        <span className="dashboard-type-pill">
                          {(d.type || "DOC").toUpperCase()}
                        </span>
                        <span className="dashboard-type">Document</span>
                      </div>

                      <h3 className="dashboard-card-title">
                        {d.title || "Untitled document"}
                      </h3>

                      <div className="dashboard-card-desc">
                        {previewText}
                      </div>

                      <p className="dashboard-date">
                        Created: {formatDate(d.created_at)}
                      </p>

                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          className="dashboard-open-btn"
                          onClick={() => openReadMore(d, "document")}
                        >
                          Read more
                        </button>

                        {downloadUrl ? (
                          <button
                            className="dashboard-open-btn"
                            onClick={() =>
                              handleDownload(
                                downloadUrl,
                                `${d.title || "document"}.${(
                                  d.type || "docx"
                                ).toLowerCase()}`
                              )
                            }
                          >
                            Download {d.type?.toUpperCase() || "DOCX"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {modalOpen && (
        <div
          className="dashboard-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="dashboard-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dashboard-modal-header">
              <div className="dashboard-modal-title">
                {modalContent.title}
              </div>
              <button
                className="dashboard-modal-close"
                onClick={closeModal}
              >
                Close
              </button>
            </div>

            {modalLoading ? (
              <div style={{ padding: 12 }}>Loading…</div>
            ) : (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              >
                {modalContent.body || "No additional content available."}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
