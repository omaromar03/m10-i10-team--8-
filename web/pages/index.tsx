import Link from "next/link";

const features = [
  {
    title: "Entity Extraction",
    description: "Extract recipe entities from raw text using the FastAPI NLP endpoint.",
    href: "/extract",
    icon: "🔎",
    label: "NLP",
  },
  {
    title: "Knowledge Graph",
    description: "Query recipe relationships from the Neo4j graph service.",
    href: "/kg",
    icon: "🧠",
    label: "Neo4j",
  },
  {
    title: "Cited RAG",
    description: "Ask recipe questions and receive grounded answers with citations.",
    href: "/rag",
    icon: "🤖",
    label: "Weaviate",
  },
];

export default function Home() {
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

      <section className="homeHero">
        <div className="homeHeroText">
          <span className="smallPill">AI.SPIRE Module 10 Integration</span>
          <h1>Recipe AI powered by RAG and Knowledge Graphs.</h1>
          <p>
            A polished multi-service demo connecting Next.js, FastAPI, Neo4j,
            Weaviate, and SentenceTransformers into one intelligent recipe assistant.
          </p>

          <div className="actions">
            <Link className="primaryAction" href="/rag">
              Try RAG Demo
            </Link>
            <Link className="secondaryAction" href="/kg">
              Explore Graph
            </Link>
          </div>
        </div>

        <div className="homePreview">
          <div className="previewHeader">
            <span className="dot green" />
            <span className="dot yellow" />
            <span className="dot red" />
          </div>
          <div className="previewBody">
            <div className="aiBubble">How do I prep ginger for stir-fry?</div>
            <div className="answerBubble">
              Slice ginger thin against the grain and discard any woody core.
              <span>[1]</span>
            </div>
            <div className="sourceRow">
              <span>Confidence</span>
              <strong>1.00</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="cardsGrid">
        {features.map((feature) => (
          <Link className="featureCard" href={feature.href} key={feature.href}>
            <div className="featureTop">
              <span className="featureIcon">{feature.icon}</span>
              <span className="smallPill">{feature.label}</span>
            </div>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
            <span className="featureLink">Open page →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
