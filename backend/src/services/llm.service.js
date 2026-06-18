const extractJson = (text) => {
  if (!text || typeof text !== "string") return null;

  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const getContentFromResponse = (json) => {
  if (typeof json?.choices?.[0]?.message?.content === "string") {
    return json.choices[0].message.content;
  }
  if (typeof json?.choices?.[0]?.text === "string") return json.choices[0].text;
  if (typeof json?.output_text === "string") return json.output_text;
  if (typeof json?.content === "string") return json.content;
  return null;
};

const buildRecommendationPrompt = ({ userPrompt, candidates }) => `
You are Agent 2, a personalized restaurant recommendation agent.

Context:
- Agent 1 has already read restaurant reviews and created AI summary profiles.
- You must recommend restaurants only from the provided candidates.
- Do not invent restaurants, menus, facts, coordinates, or reviews.
- Base every recommendation on the Agent 1 summaries.

Task:
1. Analyze the user's current state.
2. Compare that state against every restaurant's Agent 1 profile.
3. Assign fitScore from 0 to 100.
4. Return the top 1 to 3 restaurants.
5. Return JSON only.

User prompt:
${userPrompt}

Restaurant candidates:
${JSON.stringify(candidates, null, 2)}

Required JSON shape:
{
  "userState": {
    "mood": "string",
    "hungerLevel": "string",
    "temperaturePreference": "string",
    "foodStyle": ["string"],
    "atmospherePreference": ["string"],
    "avoid": ["string"],
    "priority": ["string"]
  },
  "recommendations": [
    {
      "rank": 1,
      "restaurantId": 123,
      "fitScore": 90,
      "matchedFactors": ["string"],
      "mismatchFactors": ["string"],
      "reason": "string",
      "caution": "string"
    }
  ]
}
`;

const requestRecommendation = async ({ userPrompt, candidates }) => {
  const apiUrl = process.env.CODERAMA_API_URL;
  if (!apiUrl) return null;

  const model = process.env.CODERAMA_MODEL || "default";
  const apiKey = process.env.CODERAMA_API_KEY;
  const body = {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a strict JSON restaurant recommendation agent. Use only the provided DB candidates."
      },
      {
        role: "user",
        content: buildRecommendationPrompt({ userPrompt, candidates })
      }
    ]
  };

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`CODERAMA_REQUEST_FAILED_${response.status}`);
  }

  const json = await response.json();
  return extractJson(getContentFromResponse(json));
};

module.exports = { requestRecommendation };
