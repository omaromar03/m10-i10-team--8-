import { useState } from "react";
import Link from "next/link";
import type { KGResponse, UnsupportedQueryDetail } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function KgPage() {
  const [question, setQuestion] = useState("Find Sichuan recipes that use ginger");
  const [result, setResult] = useState<KGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    setSupported(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/kg/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (response.status === 422) {
        const body = await response.json();
        const detail = body.detail as UnsupportedQueryDetail | undefined;

        if (detail?.reason === "unsupported_question") {
          setError("This question shape is not supported. Try one of the supported patterns.");
          setSupported(detail.supported_patterns);
        } else {
          setError("Validation rejected the request.");
        }
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

      setResult((await response.json()) as KGResponse);
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
        <span className="smallPill">Neo4j Knowledge Graph</span>
        <h1>Query recipe relationships.</h1>
        <p>
          Convert supported natural language questions into Cypher and inspect
          rows returned from the recipe graph.
        </p>
      </section>

      <section className="twoColumn">
        <div className="inputPanel">
          <div className="panelTitle">
            <div>
              <h2>Graph question</h2>
              <p>Ask using one of the supported recipe query shapes.</p>
            </div>
            <span className="endpointPill">POST /kg/query</span>
          </div>

          <textarea
            className="largeInput"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: Find Sichuan recipes that use ginger"
            rows={8}
          />

          <button
            className="primaryAction fullWidth"
            onClick={submit}
            disabled={loading || !question.trim()}
          >
            {loading ? "Querying graph..." : "Run graph query"}
          </button>

          {error && (
            <div className="errorBox" role="alert" data-testid="error">
              {error}
            </div>
          )}

          {supported && (
            <div className="supportBox" data-testid="supported-patterns">
              <h3>Supported patterns</h3>
              <ul>
                {supported.map((pattern, index) => (
                  <li key={`${pattern}-${index}`}>{pattern}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="outputPanel">
          <div className="panelTitle">
            <div>
              <h2>Graph output</h2>
              <p>Generated Cypher and returned rows.</p>
            </div>
            <span className="endpointPill">
              {result ? `${result.count} rows` : "Waiting"}
            </span>
          </div>

          {!result && (
            <div className="emptyState">
              <div className="emptyIcon">🧠</div>
              <h3>No graph result yet</h3>
              <p>Run a query to preview Cypher and rows here.</p>
            </div>
          )}

          {result && (
            <div className="answerStack">
              <div>
                <h3 className="sectionHeading">Generated Cypher</h3>
                <pre>{result.cypher}</pre>
              </div>

              <div className="statsGrid">
                <div className="statCard">
                  <span>Returned rows</span>
                  <strong>{result.count}</strong>
                </div>
                <div className="statCard">
                  <span>Engine</span>
                  <strong>Neo4j</strong>
                </div>
              </div>

              <div>
                <h3 className="sectionHeading">Rows</h3>
                <ul className="sourceList">
                  {result.rows.length === 0 && (
                    <li>
                      <span className="sourceBadge">0</span>
                      <div>
                        <strong>No rows returned</strong>
                        <p>Try another supported recipe graph question.</p>
                      </div>
                    </li>
                  )}

                  {result.rows.map((row, index) => (
                    <li key={index} data-testid="kg-row">
                      <span className="sourceBadge">{index + 1}</span>
                      <div>
                        <strong>Result row</strong>
                        <p>{JSON.stringify(row)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
