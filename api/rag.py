"""RAG composer — retrieve → assemble → generate → cite → grounding check."""
import re
from typing import Tuple

PROMPT_TEMPLATE = """\
Use ONLY the numbered sources below to answer the question.
Every answer must include at least one citation like [1].
If the sources do not contain the answer, say exactly:
I cannot answer this from the available sources

Sources:
{sources}

Question: {question}

Answer:
"""

SENTINEL = "I cannot answer this from the available sources"
CITATION_PATTERN = re.compile(r"\[(\d+)\]")


def assemble_prompt(question: str, chunks: list[dict]) -> Tuple[str, dict[int, dict]]:
    numbered: dict[int, dict] = {}
    lines = []

    for i, chunk in enumerate(chunks, start=1):
        numbered[i] = chunk
        lines.append(f"[{i}] {chunk['text']}")

    sources = "\n".join(lines)
    return PROMPT_TEMPLATE.format(sources=sources, question=question), numbered


def extract_citations(answer: str, numbered: dict[int, dict]) -> list[dict]:
    cited: list[dict] = []
    seen: set[int] = set()

    for match in CITATION_PATTERN.finditer(answer):
        idx = int(match.group(1))
        if idx in numbered and idx not in seen:
            seen.add(idx)
            chunk = numbered[idx]
            cited.append(
                {
                    "chunk_id": int(chunk["chunk_id"]),
                    "score": float(chunk["score"]),
                }
            )

    return cited


def _normalize_generated_text(output) -> str:
    if isinstance(output, list) and output:
        item = output[0]
        if isinstance(item, dict):
            return (
                item.get("generated_text")
                or item.get("summary_text")
                or item.get("text")
                or ""
            ).strip()

    if isinstance(output, str):
        return output.strip()

    return ""


def _retrieve_vector(question: str, embedder, weaviate_client, k: int) -> list[dict]:
    vector = embedder.encode(question).tolist()

    raw_query = (
        weaviate_client.query.get("Chunk", ["chunk_id", "text"])
        .with_near_vector({"vector": vector})
        .with_limit(k)
        .with_additional(["distance"])
        .do()
    )

    chunks = raw_query.get("data", {}).get("Get", {}).get("Chunk", []) or []

    retrieved = []
    for c in chunks:
        distance = float(c.get("_additional", {}).get("distance", 1.0))
        score = max(0.0, min(1.0, 1.0 - distance))
        retrieved.append(
            {
                "chunk_id": c["chunk_id"],
                "text": c["text"],
                "score": score,
            }
        )

    return retrieved


def _retrieve_bm25(question: str, weaviate_client, k: int) -> list[dict]:
    raw_query = (
        weaviate_client.query.get("Chunk", ["chunk_id", "text"])
        .with_bm25(query=question)
        .with_limit(k)
        .with_additional(["score"])
        .do()
    )

    chunks = raw_query.get("data", {}).get("Get", {}).get("Chunk", []) or []

    retrieved = []
    for c in chunks:
        raw_score = c.get("_additional", {}).get("score", 0.0)
        try:
            score = float(raw_score)
        except (TypeError, ValueError):
            score = 0.5

        score = max(0.1, min(1.0, score))
        retrieved.append(
            {
                "chunk_id": c["chunk_id"],
                "text": c["text"],
                "score": score,
            }
        )

    return retrieved


def compose_rag(question: str, embedder, weaviate_client, generator, k: int = 4) -> dict:
    # Retrieve from Weaviate
    retrieved = _retrieve_vector(question, embedder, weaviate_client, k)

    # Fallback to BM25 if vector retrieval returns nothing
    if not retrieved:
        retrieved = _retrieve_bm25(question, weaviate_client, k)

    # Nothing found
    if not retrieved:
        return {
            "answer": SENTINEL,
            "citations": [],
            "confidence": 0.0,
        }

    # Number retrieved chunks
    _, numbered = assemble_prompt(question, retrieved)

    # ------------------------------------------------------------------
    # TEMPORARY:
    # Skip flan-t5-base completely to isolate retrieval.
    # ------------------------------------------------------------------
    answer = f"{retrieved[0]['text']} [1]"

    citations = extract_citations(answer, numbered)

    confidence = (
        sum(c["score"] for c in citations) / len(citations)
        if citations
        else 0.0
    )
    confidence = max(0.0, min(1.0, confidence))

    return {
        "answer": answer,
        "citations": citations,
        "confidence": confidence,
    }
    