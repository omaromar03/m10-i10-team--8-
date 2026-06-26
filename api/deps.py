"""FastAPI dependency-injection helpers.

These functions resolve process-scoped resources from `app.state`.

Neo4j driver, Weaviate client, and spaCy are initialized in `main.lifespan`.
Heavy ML models are lazy-loaded on first use so the API can finish startup.
"""
from fastapi import Request

from .m8_rag import load_generator
from sentence_transformers import SentenceTransformer


async def get_session(request: Request):
    """Yield a short-lived Neo4j session from the process-scoped driver."""
    driver = request.app.state.neo4j_driver
    with driver.session() as session:
        yield session


def get_weaviate(request: Request):
    """Return the process-scoped Weaviate client."""
    return request.app.state.weaviate_client


def get_generator(request: Request):
    """Lazy-load and return the flan-t5-base generator."""
    if request.app.state.generator is None:
        request.app.state.generator = load_generator()
    return request.app.state.generator


def get_nlp(request: Request):
    """Return the process-scoped spaCy pipeline."""
    return request.app.state.nlp


def get_embedder(request: Request):
    """Lazy-load and return the sentence-transformers embedder."""
    if request.app.state.embedder is None:
        request.app.state.embedder = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )
    return request.app.state.embedder
