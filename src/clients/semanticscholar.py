"""Semantic Scholar client for baseline-centric enrichment."""

from __future__ import annotations

import os
import time
from datetime import date
from logging import getLogger
from typing import Any
from urllib.parse import quote

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.core.normalize import (
    coerce_int,
    normalize_arxiv_id,
    normalize_doi,
    normalize_semanticscholar_id,
    normalize_title,
    title_hash,
)
from src.models.paper import Paper

LOGGER = getLogger(__name__)

PAPER_FIELDS = ",".join(
    [
        "paperId",
        "title",
        "abstract",
        "authors",
        "venue",
        "year",
        "publicationDate",
        "externalIds",
        "url",
        "openAccessPdf",
        "citationCount",
        "referenceCount",
    ]
)
CITING_PAPER_FIELDS = ",".join(f"citingPaper.{field}" for field in PAPER_FIELDS.split(","))


class SemanticScholarError(RuntimeError):
    """Raised when Semantic Scholar requests fail."""


class SemanticScholarRateLimitError(SemanticScholarError):
    """Raised when Semantic Scholar rate limits the client."""

    def __init__(self, message: str, retry_after_seconds: int | None = None) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class SemanticScholarClient:
    """Thin wrapper around the Semantic Scholar graph API."""

    base_url = "https://api.semanticscholar.org/graph/v1"

    def __init__(self, timeout: int = 30, user_agent: str = "research-radar/0.1", api_key_env: str = "SEMANTIC_SCHOLAR_API_KEY") -> None:
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})
        api_key = os.getenv(api_key_env)
        if api_key:
            self.session.headers["x-api-key"] = api_key
        retry = Retry(
            total=None,
            connect=0,
            read=0,
            status=1,
            redirect=0,
            other=0,
            backoff_factor=0.4,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=frozenset(["GET"]),
        )
        self.session.mount("https://", HTTPAdapter(max_retries=retry))

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        try:
            response = self.session.get(f"{self.base_url}{path}", params=params, timeout=self.timeout)
            if response.status_code == 429:
                retry_after_header = response.headers.get("Retry-After")
                retry_after_seconds = None
                if retry_after_header and retry_after_header.isdigit():
                    retry_after_seconds = int(retry_after_header)
                raise SemanticScholarRateLimitError(
                    "Semantic Scholar API rate limit exceeded.",
                    retry_after_seconds=retry_after_seconds,
                )
            response.raise_for_status()
        except requests.RequestException as exc:  # pragma: no cover - network path
            raise SemanticScholarError(str(exc)) from exc
        time.sleep(0.2)
        return response.json()

    def get_paper(self, identifier: str) -> Paper | None:
        """Fetch a single paper by Semantic Scholar id or external identifier."""
        payload = self._get(f"/paper/{quote(identifier, safe=':')}", params={"fields": PAPER_FIELDS})
        if not payload:
            return None
        return self._map_paper(payload)

    def search_papers(self, query: str, limit: int = 5) -> list[Paper]:
        """Search papers by a textual query."""
        payload = self._get("/paper/search", params={"query": query, "limit": limit, "fields": PAPER_FIELDS})
        return [self._map_paper(item) for item in payload.get("data", [])]

    def get_new_citations(self, identifier: str, since_date: date, limit: int = 50) -> list[Paper]:
        """Fetch recent citing papers for a baseline."""
        papers: list[Paper] = []
        offset = 0

        while len(papers) < limit:
            page_size = min(100, limit - len(papers))
            payload = self._get(
                f"/paper/{quote(identifier, safe=':')}/citations",
                params={"fields": CITING_PAPER_FIELDS, "limit": page_size, "offset": offset},
            )
            rows = payload.get("data", [])
            if not rows:
                break
            for row in rows:
                citing = row.get("citingPaper") or {}
                paper = self._map_paper(citing)
                if self._paper_is_recent(paper, since_date):
                    papers.append(paper)
            if len(rows) < page_size:
                break
            offset += len(rows)

        return papers

    def _paper_is_recent(self, paper: Paper, since_date: date) -> bool:
        """Filter citations to the requested date window."""
        if paper.publication_date:
            return paper.publication_date >= since_date.isoformat()
        if paper.year is not None:
            return paper.year >= since_date.year
        return True

    def _map_paper(self, item: dict[str, Any]) -> Paper:
        """Map a Semantic Scholar paper into the shared model."""
        external_ids = item.get("externalIds", {}) or {}
        doi = normalize_doi(external_ids.get("DOI"))
        arxiv_id = normalize_arxiv_id(external_ids.get("ArXiv"))
        semanticscholar_id = normalize_semanticscholar_id(item.get("paperId"))
        title = item.get("title") or "Untitled paper"
        pdf_url = (item.get("openAccessPdf") or {}).get("url")
        return Paper(
            title=title,
            normalized_title=normalize_title(title),
            title_hash=title_hash(title),
            abstract=item.get("abstract"),
            authors=[author.get("name") for author in item.get("authors", []) if author.get("name")],
            year=coerce_int(item.get("year")),
            publication_date=item.get("publicationDate"),
            venue=item.get("venue"),
            doi=doi,
            arxiv_id=arxiv_id,
            semanticscholar_id=semanticscholar_id,
            url=item.get("url"),
            pdf_url=pdf_url,
            citations_count=coerce_int(item.get("citationCount")),
            references_count=coerce_int(item.get("referenceCount")),
            external_ids={key: str(value) for key, value in external_ids.items() if value},
            source_names=["semanticscholar"],
        )
