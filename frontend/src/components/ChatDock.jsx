import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { sendChatMessageStream } from "../api/ai";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: "원하는 분위기나 조건을 말해주면 어울리는 맛집을 추천해드릴게요."
};

const makeMessageId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const isSafeUrl = (url) => /^https?:\/\/[^\s]+$/i.test(url);

const renderInlineMarkdown = (text) => {
  const nodes = [];
  let cursor = 0;
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    if (match[1]) {
      nodes.push(<strong key={`${match.index}-bold`}>{match[1]}</strong>);
    } else {
      const label = match[2];
      const url = match[3];
      if (isSafeUrl(url)) {
        nodes.push(
          <a key={`${match.index}-link`} href={url} target="_blank" rel="noreferrer">
            {label}
          </a>
        );
      } else {
        nodes.push(label);
      }
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
};

const renderMarkdownBlocks = (text) => {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  if (!normalizedText) return null;

  const lines = normalizedText.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (unorderedMatch) {
      const items = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*[-*]\s+(.+)/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index += 1;
      }

      blocks.push(
        <ul key={`ul-${index}`} className="chat-markdown-list">
          {items.map((item, itemIndex) => (
            <li key={`ul-${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (orderedMatch) {
      const items = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*\d+\.\s+(.+)/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index += 1;
      }

      blocks.push(
        <ol key={`ol-${index}`} className="chat-markdown-list">
          {items.map((item, itemIndex) => (
            <li key={`ol-${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index];
      if (!nextLine.trim()) break;
      if (/^\s*[-*]\s+/.test(nextLine) || /^\s*\d+\.\s+/.test(nextLine)) break;
      paragraphLines.push(nextLine.trim());
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="chat-markdown-paragraph">
        {renderInlineMarkdown(paragraphLines.join(" "))}
      </p>
    );
  }

  return blocks;
};

export default function ChatDock({ onOpenRestaurant }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messageRefs = useRef(new Map());
  const activeAssistantIdRef = useRef(null);

  const requestHistory = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  useEffect(() => {
    if (!isOpen || !isSending || !activeAssistantIdRef.current) return;

    const activeAssistantNode = messageRefs.current.get(activeAssistantIdRef.current);
    activeAssistantNode?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages, isOpen, isSending]);

  const submitMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    const userMessage = { id: makeMessageId(), role: "user", content: text };
    const assistantId = makeMessageId();
    activeAssistantIdRef.current = assistantId;

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        sources: []
      }
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
            throw new Error(data?.message || "채팅 서버에 연결하지 못했어요.");
          }
        }
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "채팅 서버에 연결하지 못했어요.");
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
        <span>{isOpen ? "닫기" : "AI 채팅"}</span>
      </button>

      {isOpen ? (
        <section className="chat-dock" aria-label="AI 채팅 도우미">
          <header className="chat-header">
            <div className="chat-title">
              <div className="chat-icon">
                <Bot size={18} />
              </div>
              <div>
                <p>맛집 추천 채팅</p>
                <span>원하는 조건을 편하게 물어보세요</span>
              </div>
            </div>
            <button className="chat-close" type="button" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </header>

          <div className="chat-messages">
            {messages.map((message) => (
              <article
                key={message.id}
                ref={(node) => {
                  if (node) {
                    messageRefs.current.set(message.id, node);
                  } else {
                    messageRefs.current.delete(message.id);
                  }
                }}
                className={`chat-message chat-message--${message.role}`}
              >
                <div className="chat-bubble">
                  {renderMarkdownBlocks(message.content || (message.streaming ? "..." : ""))}
                  {message.streaming ? <span className="chat-streaming-dot">응답 중</span> : null}
                </div>

                {message.sources?.length ? (
                  <details className="chat-sources">
                    <summary className="chat-sources__summary">
                      참고한 리뷰 {message.sources.length}개
                    </summary>
                    <div className="chat-sources__list" aria-label="참고한 리뷰 목록">
                      {message.sources.map((source) => (
                        <button
                          key={`${source.restaurant_id}-${source.review_id}`}
                          className="chat-source-card"
                          type="button"
                          onClick={() => onOpenRestaurant?.(source.restaurant_id)}
                        >
                          <strong>{source.restaurant_name}</strong>
                          <span>{source.review_excerpt}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                ) : null}
              </article>
            ))}
            {isSending ? <div className="chat-status">관련 리뷰를 찾는 중이에요...</div> : null}
            {error ? <div className="chat-error">{error}</div> : null}
          </div>

          <form className="chat-form" onSubmit={submitMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder="예: 조용하고 가성비 좋은 한식집 추천해줘"
              rows={3}
            />
            <button type="submit" disabled={isSending || !draft.trim()}>
              <Send size={16} />
              보내기
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
