import { useEffect, useMemo, useRef, useState } from "react";

const POLL_MS = 3000;
const URL_PATTERN = /(https?:\/\/[^\s<>"')]+)/gi;
const IMAGE_EXTENSION_PATTERN = /\.(gif|png|jpe?g|webp)(\?.*)?$/i;
const MEDIA_HOSTS = [
  "media.giphy.com",
  "i.giphy.com",
  "media.tenor.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "images-ext-1.discordapp.net",
  "images-ext-2.discordapp.net"
];

function formatFullDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDay(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function groupMessagesByDay(messages) {
  const groups = [];
  for (const message of messages) {
    const key = message.createdAt ? new Date(message.createdAt).toDateString() : "Unknown";
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: message.createdAt ? formatDay(message.createdAt) : "Unknown date", messages: [] });
    }
    groups[groups.length - 1].messages.push(message);
  }
  return groups;
}

function getUrls(text = "") {
  return Array.from(text.matchAll(URL_PATTERN), (match) => match[0].replace(/[.,!?]+$/, ""));
}

function isEmbeddableMediaUrl(url = "") {
  try {
    const parsed = new URL(url);
    return IMAGE_EXTENSION_PATTERN.test(parsed.pathname) || MEDIA_HOSTS.some((host) => parsed.hostname.endsWith(host));
  } catch {
    return false;
  }
}

function getMediaPreview(url = "") {
  try {
    const parsed = new URL(url);
    if (isEmbeddableMediaUrl(url)) return { href: url, src: url };

    if (parsed.hostname.endsWith("giphy.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = parts[0] === "media" ? parts[1] : parts[parts.length - 1];
      if (id && /^[a-zA-Z0-9]+$/.test(id)) {
        return { href: url, src: `https://media.giphy.com/media/${id}/giphy.gif` };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function splitTextIntoParts(text = "") {
  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0].replace(/[.,!?]+$/, "");
    const start = match.index;
    if (start > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, start) });
    parts.push({ type: "link", value: url });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  return parts.length ? parts : [{ type: "text", value: text }];
}

function useAutoScroll(messages) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length, messages[messages.length - 1]?.id]);

  return ref;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

function ConversationButton({ conversation, active, onClick }) {
  return (
    <button className={`conversation-button ${active ? "active" : ""}`} onClick={onClick} type="button">
      <span className="avatar small">{initials(conversation.title)}</span>
      <span className="conversation-copy">
        <span className="conversation-title">{conversation.title}</span>
        <span className="conversation-meta">
          {conversation.count} messages
          {conversation.latestAt ? ` - ${formatFullDate(conversation.latestAt)}` : ""}
        </span>
      </span>
    </button>
  );
}

function MessageRow({ message }) {
  const isGhost = message.role === "ghost";
  const mediaPreviews = getUrls(message.text).map(getMediaPreview).filter(Boolean);
  const textParts = splitTextIntoParts(message.text);

  return (
    <article className={`message-row ${isGhost ? "ghost" : "human"}`}>
      <div className="avatar">{initials(message.authorName)}</div>
      <div className="message-main">
        <div className="message-heading">
          <span className="author">{message.authorName}</span>
          <time>{formatFullDate(message.createdAt)}</time>
        </div>
        <p>
          {textParts.map((part, index) =>
            part.type === "link" ? (
              <a href={part.value} key={`${part.value}-${index}`} rel="noreferrer" target="_blank">
                {part.value}
              </a>
            ) : (
              <span key={`${part.value}-${index}`}>{part.value}</span>
            )
          )}
        </p>
        {mediaPreviews.length ? (
          <div className="message-media-grid">
            {mediaPreviews.map((media) => (
              <a className="message-media" href={media.href} key={media.href} rel="noreferrer" target="_blank">
                <img alt="Shared media preview" loading="lazy" src={media.src} />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ChatTimeline({ messages, loading }) {
  const scrollRef = useAutoScroll(messages);
  const groups = useMemo(() => groupMessagesByDay(messages), [messages]);

  if (!loading && !messages.length) {
    return (
      <main className="chat-scroll empty-state">
        <div>
          <h2>No messages found</h2>
          <p>Run the backup pull first, then refresh this viewer.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="chat-scroll" ref={scrollRef}>
      {groups.map((group) => (
        <section className="day-group" key={group.key}>
          <div className="day-divider">
            <span>{group.label}</span>
          </div>
          {group.messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </section>
      ))}
    </main>
  );
}

export default function App() {
  const [selected, setSelected] = useState("girlfriend");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const activeConversation = conversations.find((conversation) => conversation.id === selected);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const data = await fetchJson("/api/health", controller.signal);
        setHealth(data);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadHealth();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadConversations() {
      try {
        const data = await fetchJson("/api/conversations", controller.signal);
        if (!cancelled) setConversations(data.conversations || []);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      }
    }

    loadConversations();
    const timer = window.setInterval(loadConversations, POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadMessages() {
      try {
        setLoading(true);
        const data = await fetchJson(`/api/conversations/${selected}/messages`, controller.signal);
        if (!cancelled) {
          setMessages(data.messages || []);
          setLastUpdatedAt(new Date());
          setError("");
        }
      } catch (loadError) {
        if (!cancelled && loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();
    const timer = window.setInterval(loadMessages, POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [selected]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AG</div>
          <div>
            <h1>Ghost Chats</h1>
            <p>Local DM archive</p>
          </div>
        </div>

        <nav className="conversation-list" aria-label="DM conversations">
          {conversations.map((conversation) => (
            <ConversationButton
              active={conversation.id === selected}
              conversation={conversation}
              key={conversation.id}
              onClick={() => setSelected(conversation.id)}
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>DB: {health?.dbName || "connecting"}</span>
          <span>{health?.totalMessages ?? 0} archived rows</span>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <h2>{activeConversation?.title || "Loading conversation"}</h2>
            <p>
              {messages.length} messages
              {lastUpdatedAt ? ` - updated ${formatFullDate(lastUpdatedAt.toISOString())}` : ""}
            </p>
          </div>
          <div className={`live-pill ${error ? "error" : ""}`}>{error ? "API issue" : "Auto updating"}</div>
        </header>

        {error ? <div className="error-bar">{error}</div> : null}
        <ChatTimeline loading={loading} messages={messages} />
      </section>
    </div>
  );
}
