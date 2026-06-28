import { useState } from "react";
import Link from "next/link";
import type { RAGResponse } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RagPage() {
  const [question, setQuestion] = useState("How do I prep ginger for stir-fry?");
  const [result, setResult] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/rag/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, k: 4 }),
      });

      if (response.status === 422) {
        setError("Question rejected by validation.");
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

      setResult((await response.json()) as RAGResponse);
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
        <span className="smallPill">Weaviate RAG</span>
        <h1>Cited recipe answers.</h1>
        <p>
          Ask a natural language recipe question. The backend retrieves relevant
          chunks and returns a grounded answer with citations and confidence.
        </p>
      </section>

      <section className="twoColumn">
        <div className="inputPanel">
          <div className="panelTitle">
            <div>
              <h2>Ask the assistant</h2>
              <p>Use the seeded recipe knowledge base.</p>
            </div>
            <span className="endpointPill">POST /rag/answer</span>
          </div>

          <textarea
            className="largeInput"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a recipe question..."
            rows={8}
          />

          <button
            className="primaryAction fullWidth"
            onClick={submit}
            disabled={loading || !question.trim()}
          >
            {loading ? "Retrieving answer..." : "Ask AI"}
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
              <h2>AI response</h2>
              <p>Grounded answer, sources, and confidence.</p>
            </div>
            <span className="endpointPill">Cited</span>
          </div>

          {!result && (
            <div className="emptyState">
              <div className="emptyIcon">🤖</div>
              <h3>No answer yet</h3>
              <p>Submit a question to preview the cited response.</p>
            </div>
          )}

          {result && (
            <article className="answerStack">
              <div className="assistantMessage">
                <span className="avatar">AI</span>
                <p data-testid="rag-answer">{result.answer}</p>
              </div>

              <div className="statsGrid">
                <div className="statCard">
                  <span>Confidence</span>
                  <strong>{result.confidence.toFixed(2)}</strong>
                </div>
                <div className="statCard">
                  <span>Citations</span>
                  <strong>{result.citations.length}</strong>
                </div>
              </div>

              <div>
                <h3 className="sectionHeading">Sources</h3>
                <ul className="sourceList">
                  {result.citations.map((citation) => (
                    <li key={citation.chunk_id}>
                      <span className="sourceBadge">
                        <span data-testid="citation-marker">
                          {citation.chunk_id}
                        </span>
                      </span>
                      <div>
                        <strong>Retrieved chunk</strong>
                        <p>Grounding source from Weaviate.</p>
                      </div>
                      <span className="scoreText">
                        {citation.score.toFixed(3)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
