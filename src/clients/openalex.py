"""OpenAlex client for topic-based work discovery."""

from __future__ import annotations

import time
from datetime import date
from logging import getLogger
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.core.normalize import (
    coerce_int,
    inverted_index_to_text,
    normalize_arxiv_id,
    normalize_doi,
    normalize_openalex_id,
    normalize_title,
    title_hash,
)
from src.models.paper import Paper

LOGGER = getLogger(__name__)


def _as_dict(value: Any) -> dict[str, Any]:
    """Return a dict-like payload or an empty dict for null/malformed values."""
    return value if isinstance(value, dict) else {}


class OpenAlexError(RuntimeError):
    """Raised when the OpenAlex client cannot complete a request."""


class OpenAlexClient:
    """Thin wrapper around the OpenAlex works API."""

    base_url = "https://api.openalex.org"

    def __init__(self, email: str | None = None, timeout: int = 30, user_agent: str = "research-radar/0.1") -> None:
        self.email = email
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})
        retry = Retry(
            total=None,
            connect=0,
            read=0,
            status=1,
            redirect=0,
            other=0,
            backoff_factor=0.4,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=frozenset(["GET"]),
        )
        self.session.mount("https://", HTTPAdapter(max_retries=retry))

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        try:
            response = self.session.get(f"{self.base_url}{path}", params=params, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException as exc:  # pragma: no cover - network path
            raise OpenAlexError(str(exc)) from exc
        time.sleep(0.15)
        return response.json()

    def search_recent_works(
        self,
        query: str,
        since_date: date,
        until_date: date,
        max_results: int = 50,
    ) -> list[Paper]:
        """Search recent works matching a topic query."""
        return self.search_works(
            query=query,
            max_results=max_results,
            filters=f"from_publication_date:{since_date.isoformat()},to_publication_date:{until_date.isoformat()}",
            sort="publication_date:desc",
        )

    def search_works(
        self,
        query: str,
        max_results: int = 50,
        filters: str | None = None,
        sort: str = "relevance_score:desc",
    ) -> list[Paper]:
        """Search OpenAlex works without assuming a date window."""
        papers: list[Paper] = []
        page = 1
        remaining = max_results

        while remaining > 0:
            per_page = min(remaining, 200)
            params = {
                "search": query,
                "sort": sort,
                "page": page,
                "per-page": per_page,
            }
            if filters:
                params["filter"] = filters
            if self.email:
                params["mailto"] = self.email

            payload = self._get("/works", params=params)
            results = payload.get("results", [])
            if not results:
                break

            papers.extend(self._map_work(item) for item in results)
            remaining -= len(results)
            if len(results) < per_page:
                break
            page += 1

        return papers

    def get_work(self, identifier: str) -> Paper | None:
        """Fetch a single work by OpenAlex id."""
        normalized = normalize_openalex_id(identifier)
        if not normalized:
            return None
        openalex_id = normalized.rsplit("/", 1)[-1]
        payload = self._get(f"/works/{openalex_id}")
        return self._map_work(payload)

    def _map_work(self, item: dict[str, Any]) -> Paper:
        """Map an OpenAlex work record into the shared Paper model."""
        ids = _as_dict(item.get("ids"))
        primary_location = _as_dict(item.get("primary_location"))
        best_oa_location = _as_dict(item.get("best_oa_location"))
        primary_source = _as_dict(primary_location.get("source"))

        authors = [
            _as_dict(authorship.get("author")).get("display_name")
            for authorship in item.get("authorships", [])
            if _as_dict(authorship.get("author")).get("display_name")
        ]
        doi = normalize_doi(item.get("doi") or ids.get("doi"))
        openalex_id = normalize_openalex_id(item.get("id") or ids.get("openalex"))
        paper_url = (
            primary_location.get("landing_page_url")
            or primary_location.get("pdf_url")
            or openalex_id
        )
        arxiv_id = normalize_arxiv_id(
            best_oa_location.get("landing_page_url")
            or primary_location.get("landing_page_url")
        )
        title = item.get("display_name") or item.get("title") or "Untitled work"
        return Paper(
            title=title,
            normalized_title=normalize_title(title),
            title_hash=title_hash(title),
            abstract=inverted_index_to_text(item.get("abstract_inverted_index")),
            authors=authors,
            year=coerce_int(item.get("publication_year")),
            publication_date=item.get("publication_date"),
            venue=primary_source.get("display_name"),
            doi=doi,
            arxiv_id=arxiv_id,
            openalex_id=openalex_id,
            url=paper_url,
            pdf_url=primary_location.get("pdf_url"),
            external_ids={key: str(value) for key, value in ids.items() if value},
            source_names=["openalex"],
        )
