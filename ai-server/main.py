from __future__ import annotations

import os
import re
import sqlite3
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import APIConnectionError, AuthenticationError, OpenAI, OpenAIError
from pydantic import BaseModel, Field
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / "backend" / ".env", override=True)

DB_PATH = Path(os.getenv("FOODAI_SQLITE_PATH", ROOT_DIR / "backend" / "data" / "app.sqlite3"))
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_CONTEXT_ITEMS = int(os.getenv("RAG_MAX_CONTEXT_ITEMS", "6"))
MAX_HISTORY_ITEMS = int(os.getenv("CHAT_HISTORY_LIMIT", "8"))

app = FastAPI(title="FoodAI RAG Server", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "AI_SERVER_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    top_k: int = Field(default=MAX_CONTEXT_ITEMS, ge=1, le=12)


class RetrievedReview(BaseModel):
    restaurant_id: int
    restaurant_name: str
    address: str | None = None
    category: str | None = None
    review_id: int
    review_excerpt: str
    source: str | None = None
    written_at: str | None = None
    is_featured: bool = False
    score: float


class ChatResponse(BaseModel):
    answer: str
    retrieved_reviews: list[RetrievedReview]
    model: str


class WeatherRecommendationRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class WeatherRecommendationResponse(BaseModel):
    temperature: float
    apparent_temperature: float
    weather_code: int
    weather_description: str
    precipitation: float
    wind_speed: float
    recommendation: str
    model: str


@dataclass(frozen=True)
class ReviewCandidate:
    restaurant_id: int
    restaurant_name: str
    address: str | None
    category: str | None
    summary: str | None
    keywords: str | None
    review_id: int
    review_content: str
    source: str | None
    written_at: str | None
    is_featured: bool


def open_db() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise HTTPException(status_code=500, detail=f"SQLite database not found: {DB_PATH}")

    conn = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def normalize_terms(text: str) -> list[str]:
    terms = re.findall(r"[0-9A-Za-z\uac00-\ud7a3]+", text.lower())
    seen: set[str] = set()
    ordered: list[str] = []
    for term in terms:
        if term and term not in seen:
            seen.add(term)
            ordered.append(term)
    return ordered


def excerpt(text: str, max_length: int = 180) -> str:
    cleaned = " ".join((text or "").split())
    if len(cleaned) <= max_length:
        return cleaned
    return cleaned[: max_length - 3].rstrip() + "..."


def fetch_candidates(conn: sqlite3.Connection) -> list[ReviewCandidate]:
    rows = conn.execute(
        """
        SELECT
            r.id AS restaurant_id,
            r.name AS restaurant_name,
            r.address AS address,
            r.category AS category,
            s.summary AS summary,
            k.keywords AS keywords,
            rv.id AS review_id,
            rv.content AS review_content,
            rv.source AS source,
            rv.written_at AS written_at,
            rv.is_featured AS is_featured
        FROM restaurants r
        JOIN reviews rv ON rv.restaurant_id = r.id
        LEFT JOIN restaurant_ai_summaries s ON s.restaurant_id = r.id
        LEFT JOIN (
            SELECT
                rk.restaurant_id AS restaurant_id,
                GROUP_CONCAT(k.keyword, ', ') AS keywords
            FROM restaurant_keywords rk
            JOIN keywords k ON k.id = rk.keyword_id
            GROUP BY rk.restaurant_id
        ) k ON k.restaurant_id = r.id
        ORDER BY rv.id DESC
        """
    ).fetchall()

    return [
        ReviewCandidate(
            restaurant_id=row["restaurant_id"],
            restaurant_name=row["restaurant_name"],
            address=row["address"],
            category=row["category"],
            summary=row["summary"],
            keywords=row["keywords"],
            review_id=row["review_id"],
            review_content=row["review_content"],
            source=row["source"],
            written_at=row["written_at"],
            is_featured=bool(row["is_featured"]),
        )
        for row in rows
    ]


def score_candidate(query_terms: list[str], query_text: str, candidate: ReviewCandidate) -> float:
    haystack_parts = [
        candidate.restaurant_name or "",
        candidate.address or "",
        candidate.category or "",
        candidate.summary or "",
        candidate.keywords or "",
        candidate.review_content or "",
    ]
    haystack = " ".join(part.lower() for part in haystack_parts if part)
    if not haystack:
        return 0.0

    score = 0.0
    lowered_query = query_text.lower().strip()
    if lowered_query and lowered_query in haystack:
        score += 5.0

    for term in query_terms:
        if term in candidate.restaurant_name.lower():
            score += 3.0
        if candidate.category and term in candidate.category.lower():
            score += 1.5
        if candidate.keywords and term in candidate.keywords.lower():
            score += 1.6
        if candidate.summary and term in candidate.summary.lower():
            score += 1.0
        if term in candidate.review_content.lower():
            score += 2.2
        if term in haystack:
            score += 0.9

    if candidate.is_featured:
        score += 0.5

    score += min(len(query_terms), 8) * 0.05
    return score


def retrieve_reviews(conn: sqlite3.Connection, query_text: str, top_k: int) -> list[RetrievedReview]:
    query_terms = normalize_terms(query_text)
    candidates = fetch_candidates(conn)
    scored = [
        (score_candidate(query_terms, query_text, candidate), candidate)
        for candidate in candidates
    ]
    positive_scores = [item for item in scored if item[0] > 0]

    if positive_scores:
        ranked = positive_scores
    else:
        ranked = [(0.1 if candidate.is_featured else 0.0, candidate) for candidate in candidates]

    ranked.sort(key=lambda item: (-item[0], item[1].review_id))
    selected = ranked[:top_k]

    return [
        RetrievedReview(
            restaurant_id=candidate.restaurant_id,
            restaurant_name=candidate.restaurant_name,
            address=candidate.address,
            category=candidate.category,
            review_id=candidate.review_id,
            review_excerpt=excerpt(candidate.review_content),
            source=candidate.source,
            written_at=candidate.written_at,
            is_featured=candidate.is_featured,
            score=round(score, 3),
        )
        for score, candidate in selected
    ]


def build_context_block(reviews: list[RetrievedReview]) -> str:
    if not reviews:
        return "No matching reviews were retrieved from SQLite."

    lines: list[str] = []
    for item in reviews:
        header = (
            f"- Restaurant: {item.restaurant_name} "
            f"(id={item.restaurant_id}, review_id={item.review_id}, score={item.score})"
        )
        meta = []
        if item.category:
            meta.append(f"category={item.category}")
        if item.address:
            meta.append(f"address={item.address}")
        if item.source:
            meta.append(f"source={item.source}")
        if item.written_at:
            meta.append(f"written_at={item.written_at}")
        if item.is_featured:
            meta.append("featured=true")
        if meta:
            header += " | " + ", ".join(meta)
        lines.append(header)
        lines.append(f"  review: {item.review_excerpt}")
    return "\n".join(lines)


def build_messages(query_text: str, history: list[ChatMessage], context_block: str) -> list[dict[str, Any]]:
    system_prompt = (
        "You are a Korean restaurant assistant. Answer in Korean. "
        "Use the provided review context as your main evidence. "
        "If the retrieved reviews do not support a strong answer, say so clearly and ask one short follow-up question. "
        "Prefer concise, practical recommendations and mention the restaurant names or review clues when relevant."
    )

    conversation = [{"role": "system", "content": system_prompt}]
    for item in history[-MAX_HISTORY_ITEMS:]:
        conversation.append({"role": item.role, "content": item.content})

    conversation.append(
        {
            "role": "system",
            "content": f"Retrieved review context:\n{context_block}",
        }
    )
    conversation.append({"role": "user", "content": query_text})
    return conversation


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured for the AI server.",
        )
    return OpenAI(api_key=api_key)


def format_openai_error(error: Exception) -> str:
    if isinstance(error, AuthenticationError):
        return "OpenAI API key is invalid or revoked. Please update OPENAI_API_KEY in backend/.env."
    if isinstance(error, APIConnectionError):
        return "Could not connect to OpenAI API. Check internet, firewall, VPN, or proxy settings."
    if isinstance(error, OpenAIError):
        return f"OpenAI request failed: {error.__class__.__name__}: {error}"
    return f"Unexpected AI server error: {error.__class__.__name__}: {error}"


WEATHER_DESCRIPTIONS = {
    0: "맑음",
    1: "대체로 맑음",
    2: "부분적으로 흐림",
    3: "흐림",
    45: "안개",
    48: "짙은 안개",
    51: "약한 이슬비",
    53: "이슬비",
    55: "강한 이슬비",
    61: "약한 비",
    63: "비",
    65: "강한 비",
    71: "약한 눈",
    73: "눈",
    75: "강한 눈",
    80: "약한 소나기",
    81: "소나기",
    82: "강한 소나기",
    95: "뇌우",
    96: "우박을 동반한 뇌우",
    99: "강한 우박을 동반한 뇌우",
}


def fetch_current_weather(latitude: float, longitude: float) -> dict[str, Any]:
    query = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": (
                "temperature_2m,apparent_temperature,weather_code,"
                "precipitation,wind_speed_10m"
            ),
            "timezone": "Asia/Seoul",
        }
    )
    with urlopen(f"https://api.open-meteo.com/v1/forecast?{query}", timeout=12) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload["current"]


def get_weather_restaurant_context(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT
            r.name,
            r.category,
            s.summary,
            s.pros_json,
            s.recommended_for_json
        FROM restaurants r
        JOIN restaurant_ai_summaries s ON s.restaurant_id = r.id
        WHERE s.summary IS NOT NULL
        ORDER BY CAST(s.value_for_money AS REAL) DESC, r.id
        LIMIT 16
        """
    ).fetchall()
    return [dict(row) for row in rows]


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "db_path": str(DB_PATH),
        "model": OPENAI_MODEL,
    }


@app.post("/weather/recommendation", response_model=WeatherRecommendationResponse)
def weather_recommendation(
    request: WeatherRecommendationRequest,
) -> WeatherRecommendationResponse:
    try:
        weather = fetch_current_weather(request.latitude, request.longitude)
    except Exception as error:
        raise HTTPException(status_code=502, detail="현재 날씨를 불러오지 못했습니다.") from error

    with open_db() as conn:
        restaurant_context = get_weather_restaurant_context(conn)

    weather_code = int(weather["weather_code"])
    weather_description = WEATHER_DESCRIPTIONS.get(weather_code, "변화가 있는 날씨")
    prompt = (
        "당신은 성균관대학교 자연과학캠퍼스 주변 맛집을 추천하는 음식 에이전트입니다. "
        "현재 날씨와 제공된 실제 음식점 AI 요약을 근거로 오늘 먹기 좋은 메뉴와 음식점 2~3곳을 "
        "한국어로 간결하게 추천하세요. 날씨와 메뉴가 어울리는 이유를 포함하고, 제공되지 않은 "
        "음식점이나 메뉴는 지어내지 마세요.\n\n"
        f"현재 날씨: {weather_description}, 기온 {weather['temperature_2m']}°C, "
        f"체감 {weather['apparent_temperature']}°C, 강수 {weather['precipitation']}mm, "
        f"풍속 {weather['wind_speed_10m']}km/h\n\n"
        f"음식점 후보:\n{json.dumps(restaurant_context, ensure_ascii=False)}"
    )

    try:
        completion = get_openai_client().chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "날씨와 실제 리뷰 데이터에 근거해 메뉴를 추천하는 AI 에이전트입니다.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail=format_openai_error(error)) from error

    recommendation = completion.choices[0].message.content or ""
    return WeatherRecommendationResponse(
        temperature=float(weather["temperature_2m"]),
        apparent_temperature=float(weather["apparent_temperature"]),
        weather_code=weather_code,
        weather_description=weather_description,
        precipitation=float(weather["precipitation"]),
        wind_speed=float(weather["wind_speed_10m"]),
        recommendation=recommendation.strip(),
        model=OPENAI_MODEL,
    )


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    query_text = request.message.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="message is required")

    with open_db() as conn:
        retrieved_reviews = retrieve_reviews(conn, query_text, request.top_k)

    context_block = build_context_block(retrieved_reviews)
    messages = build_messages(query_text, request.history, context_block)
    client = get_openai_client()

    try:
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=0.3,
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail=format_openai_error(error)) from error

    answer = completion.choices[0].message.content or ""
    return ChatResponse(
        answer=answer.strip(),
        retrieved_reviews=retrieved_reviews,
        model=OPENAI_MODEL,
    )


@app.post("/chat/stream")
def chat_stream(request: ChatRequest) -> StreamingResponse:
    query_text = request.message.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="message is required")

    with open_db() as conn:
        retrieved_reviews = retrieve_reviews(conn, query_text, request.top_k)

    context_block = build_context_block(retrieved_reviews)
    messages = build_messages(query_text, request.history, context_block)
    client = get_openai_client()

    def event_stream():
        yield f"event: meta\ndata: {json.dumps({'retrieved_reviews': [item.model_dump() for item in retrieved_reviews], 'model': OPENAI_MODEL}, ensure_ascii=False)}\n\n"

        try:
            stream = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.3,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    yield f"event: delta\ndata: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
        except Exception as error:
            yield f"event: error\ndata: {json.dumps({'message': format_openai_error(error)}, ensure_ascii=False)}\n\n"
            return

        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
