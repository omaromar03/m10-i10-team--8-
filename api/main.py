"""FastAPI application — recipe service."""
import os
from contextlib import asynccontextmanager

import spacy
import weaviate
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer

from .deps import get_embedder, get_generator, get_nlp, get_session, get_weaviate
from .kg import wrap_kg_query
from .m8_rag import load_generator
from .models import (
    ExtractRequest,
    ExtractResponse,
    HealthResponse,
    KGRequest,
    KGResponse,
    RAGRequest,
    RAGResponse,
    UnsupportedQueryDetail,
)
from .nlp import extract_entities
from .rag import compose_rag
from .w9b_mapper.errors import UnsupportedQueryError
from .w9b_mapper.shapes import SUPPORTED_PATTERNS


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.neo4j_driver = GraphDatabase.driver(
        os.environ["NEO4J_URI"],
        auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]),
    )

    app.state.weaviate_client = weaviate.Client(os.environ["WEAVIATE_URL"])

    # Load light model only at startup
    app.state.nlp = spacy.load("en_core_web_sm")

    # Lazy-load heavy models later when /rag/answer is called
    app.state.generator = None
    app.state.embedder = None

    yield

    app.state.neo4j_driver.close()


app = FastAPI(title="M10 Recipe Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("WEB_ORIGIN", "http://localhost:3000")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest, nlp=Depends(get_nlp)) -> ExtractResponse:
    return ExtractResponse(entities=extract_entities(req.text, nlp))


@app.post("/kg/query", response_model=KGResponse)
def kg_query(req: KGRequest, session=Depends(get_session)) -> KGResponse:
    try:
        cypher, params = wrap_kg_query(req.question)
    except UnsupportedQueryError:
        raise HTTPException(
            status_code=422,
            detail=UnsupportedQueryDetail(
                reason="unsupported_question",
                supported_patterns=list(SUPPORTED_PATTERNS),
            ).model_dump(),
        )

    rows = [r.data() for r in session.run(cypher, **params)]
    return KGResponse(cypher=cypher, rows=rows, count=len(rows))


@app.post("/rag/answer", response_model=RAGResponse)
def rag_answer(
    req: RAGRequest,
    weaviate_client=Depends(get_weaviate),
    embedder=Depends(get_embedder),
) -> RAGResponse:
    result = compose_rag(req.question, embedder, weaviate_client, None, k=req.k)
    return RAGResponse(**result)


@app.get("/healthz", response_model=HealthResponse)
def healthz() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/readyz")
def readyz(
    session=Depends(get_session),
    weaviate_client=Depends(get_weaviate),
):
    detail = {"neo4j": "unknown", "weaviate": "unknown"}

    try:
        session.run("RETURN 1").single()
        detail["neo4j"] = "ok"
    except Exception as exc:
        detail["neo4j"] = f"unavailable: {exc.__class__.__name__}"

    try:
        detail["weaviate"] = "ok" if weaviate_client.is_ready() else "not ready"
    except Exception as exc:
        detail["weaviate"] = f"unavailable: {exc.__class__.__name__}"

    if detail["neo4j"] != "ok" or detail["weaviate"] != "ok":
        raise HTTPException(status_code=503, detail=detail)

    return detail
