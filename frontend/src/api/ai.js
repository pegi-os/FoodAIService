const AI_API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL || "http://localhost:8000";

const parseSseBlock = (block) => {
  const lines = block.split("\n");
  const event = lines.find((line) => line.startsWith("event: "))?.slice(7) || "message";
  const dataLine = lines.find((line) => line.startsWith("data: "))?.slice(6) || "";
  return { event, data: dataLine ? JSON.parse(dataLine) : null };
};

export async function sendChatMessageStream({ message, history = [], candidateLimit = 15, onEvent }) {
  // 질문과 최근 대화를 AI 서버로 보냅니다. candidate_limit은 1차 LLM이 고를 후보 수입니다.
  const res = await fetch(`${AI_API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      history,
      candidate_limit: candidateLimit
    })
  });

  if (!res.ok || !res.body) {
    const detail = await res.text();
    throw new Error(detail || `POST /chat/stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const block = buffer.slice(0, separatorIndex).trim();
      buffer = buffer.slice(separatorIndex + 2);
      if (block) {
        const parsed = parseSseBlock(block);
        onEvent?.(parsed);
      }
      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) {
    onEvent?.(parseSseBlock(buffer.trim()));
  }
}

export async function getWeatherRecommendation({ latitude, longitude }) {
  const res = await fetch(`${AI_API_BASE_URL}/weather/recommendation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ latitude, longitude })
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.detail || `POST /weather/recommendation failed (${res.status})`);
  }
  return payload;
}
