import { useState } from "react";
import Link from "next/link";
import type { ExtractResponse } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ExtractPage() {
  const [text, setText] = useState(
    "Mince ginger before stir-frying so it releases aromatic oils evenly into the wok."
  );
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.status === 422) {
        setError("Text rejected by validation. Use 1 to 5000 characters.");
        return;
      }

      if (response.status === 503) {
        setError("Backend not ready. Try again in a moment.");
        return;
      }

      if (!response.ok) {
        setError(`Unexpected status: ${response.status}`);
        return;
      }

      setResult((await response.json()) as ExtractResponse);
    } catch {
      setError("Network error reaching the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <nav className="navbar">
        <Link href="/" className="brand">
          <span className="brandLogo">M10</span>
          <span>Recipe Intelligence</span>
        </Link>

        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/extract">Extract</Link>
          <Link href="/kg">Knowledge Graph</Link>
          <Link href="/rag">RAG</Link>
        </div>

        <span className="statusPill">● Online</span>
      </nav>

      <section className="pageHero">
        <span className="smallPill">NLP Extraction</span>
        <h1>Extract recipe entities.</h1>
        <p>
          Paste recipe text and identify named entities returned by the FastAPI
          extraction endpoint.
        </p>
      </section>

      <section className="twoColumn">
        <div className="inputPanel">
          <div className="panelTitle">
            <div>
              <h2>Recipe text</h2>
              <p>Enter text to analyze.</p>
            </div>
            <span className="endpointPill">POST /extract</span>
          </div>

          <textarea
            className="largeInput"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste recipe text here..."
            rows={8}
          />

          <button
            className="primaryAction fullWidth"
            onClick={submit}
            disabled={loading || !text.trim()}
          >
            {loading ? "Extracting..." : "Extract entities"}
          </button>

          {error && (
            <div className="errorBox" role="alert" data-testid="error">
              {error}
            </div>
          )}
        </div>

        <div className="outputPanel">
          <div className="panelTitle">
            <div>
              <h2>Entities</h2>
              <p>Detected spans, labels, and character offsets.</p>
            </div>
            <span className="endpointPill">
              {result ? `${result.entities.length} found` : "Waiting"}
            </span>
          </div>

          {!result && (
            <div className="emptyState">
              <div className="emptyIcon">🔎</div>
              <h3>No entities yet</h3>
              <p>Run extraction to preview entities here.</p>
            </div>
          )}

          {result && (
            <ul className="sourceList">
              {result.entities.length === 0 && (
                <li>
                  <span className="sourceBadge">0</span>
                  <div>
                    <strong>No entities detected</strong>
                    <p>Try text with recipe ingredients, cuisines, or methods.</p>
                  </div>
                </li>
              )}

              {result.entities.map((entity, index) => (
                <li key={`${entity.text}-${index}`} data-testid="entity-span">
                  <span className="sourceBadge">{index + 1}</span>
                  <div>
                    <strong>{entity.text}</strong>
                    <p>
                      {entity.label} · chars {entity.start}–{entity.end}
                    </p>
                  </div>
                  <span className="scoreText">{entity.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
