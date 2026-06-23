import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { sendChatMessageStream } from "../api/ai";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: "I will read the SQLite reviews and help you find a place. Ask about mood, price, taste, or anything else."
};

const makeMessageId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export default function ChatDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const requestHistory = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen]);

  const submitMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    const userMessage = { id: makeMessageId(), role: "user", content: text };
    const assistantId = makeMessageId();
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "", streaming: true, sources: [] }
    ]);
    setDraft("");
    setIsSending(true);
    setError("");

    try {
      await sendChatMessageStream({
        message: text,
        history: requestHistory,
        onEvent: ({ event, data }) => {
          if (event === "delta" && data?.delta) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${data.delta}` }
                  : message
              )
            );
          }

          if (event === "meta" && data) {
            // 1차 후보 15곳은 내부에서만 사용하고, 2차 LLM이 최종 선택한
            // 1~3곳의 대표 리뷰만 사용자 화면에 저장합니다.
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      sources: data.retrieved_reviews || [],
                      model: data.model,
                      recommendationCount: data.recommendation_count || 0,
                      shortlistCount: data.shortlist_count || 0,
                      retrievalStrategy: data.retrieval_strategy
                    }
                  : message
              )
            );
          }

          if (event === "error") {
            throw new Error(data?.message || "Unable to connect to the chat server.");
          }
        }
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to connect to the chat server.");
    } finally {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? { ...message, streaming: false } : message
        )
      );
      setIsSending(false);
    }
  };

  const handleDraftKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <>
      <button className="chat-toggle" type="button" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? <X size={18} /> : <Sparkles size={18} />}
        <span>{isOpen ? "Close" : "AI Chat"}</span>
      </button>

      {isOpen ? (
        <section className="chat-dock" aria-label="AI chat assistant">
          <header className="chat-header">
            <div className="chat-title">
              <div className="chat-icon">
                <Bot size={18} />
              </div>
              <div>
                <p>RAG Chat</p>
                <span>SQLite review powered</span>
              </div>
            </div>
            <button className="chat-close" type="button" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </header>

          <div className="chat-messages">
            {messages.map((message) => (
              <article key={message.id} className={`chat-message chat-message--${message.role}`}>
                <div className="chat-bubble">
                  <p>{message.content || (message.streaming ? "..." : "")}</p>
                  {message.streaming ? <span className="chat-streaming-dot">typing</span> : null}
                </div>
                {message.sources?.length ? (
                  <div className="chat-sources">
                    <p className="chat-sources__label">
                      최종 추천 리뷰
                      {message.recommendationCount ? ` (${message.recommendationCount}곳)` : ""}
                    </p>
                    <div className="chat-sources__list">
                      {message.sources.map((source) => (
                        <div
                          key={`${source.restaurant_id}-${source.review_id}`}
                          className="chat-source-card"
                        >
                          <strong>{source.restaurant_name}</strong>
                          <span>{source.review_excerpt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
            {isSending ? <div className="chat-status">AI가 후보를 비교하고 있어요...</div> : null}
            {error ? <div className="chat-error">{error}</div> : null}
            <div ref={bottomRef} />
          </div>

          <form className="chat-form" onSubmit={submitMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder="Example: Recommend a quiet, budget-friendly Korean place"
              rows={3}
            />
            <button type="submit" disabled={isSending || !draft.trim()}>
              <Send size={16} />
              Send
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
