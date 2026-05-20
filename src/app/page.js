"use client";

import { useEffect, useState } from "react";

// Suggested instructions shown depending on the bot type the user picks.
const PROMPT_PRESETS = {
  support:
    "You are a friendly customer support agent. Answer questions politely using the company document.",
  faq: "You are an FAQ assistant. Give short, clear answers based on the document.",
  sales:
    "You are a helpful sales assistant. Explain products from the document and encourage the customer warmly.",
  custom: "You are a helpful WhatsApp assistant.",
};

export default function Home() {
  // --- bot creation form state ---
  const [name, setName] = useState("");
  const [botType, setBotType] = useState("custom");
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_PRESETS.custom);
  const [doc, setDoc] = useState(null); // { fileName, charCount, text }
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState(null); // { type, text }

  // --- bots list + test chat state ---
  const [bots, setBots] = useState([]);
  const [activeBot, setActiveBot] = useState(null);
  const [chat, setChat] = useState([]); // { role: 'user'|'bot', text }
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Load the list of bots when the page opens.
  useEffect(() => {
    loadBots();
  }, []);

  async function loadBots() {
    try {
      const res = await fetch("/api/bots");
      const data = await res.json();
      if (res.ok) setBots(data.bots || []);
    } catch {
      /* ignore — the list just stays empty */
    }
  }

  function onTypeChange(value) {
    setBotType(value);
    setSystemPrompt(PROMPT_PRESETS[value] || PROMPT_PRESETS.custom);
  }

  // Upload a file → server extracts the text → we keep the text in state.
  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFormMsg(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDoc(data);
      setFormMsg({
        type: "success",
        text: `Loaded "${data.fileName}" — ${data.charCount} characters.`,
      });
    } catch (err) {
      setDoc(null);
      setFormMsg({ type: "error", text: err.message });
    } finally {
      setUploading(false);
    }
  }

  // Save the bot to the database.
  async function onCreate() {
    if (!name.trim()) {
      setFormMsg({ type: "error", text: "Please enter a bot name." });
      return;
    }
    setCreating(true);
    setFormMsg(null);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          botType,
          systemPrompt,
          documentName: doc?.fileName || "",
          documentText: doc?.text || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create bot");

      setFormMsg({
        type: "success",
        text: `Bot "${data.bot.name}" created with ${data.bot.chunkCount ?? 0} searchable knowledge chunks!`,
      });
      setName("");
      setDoc(null);
      await loadBots();
    } catch (err) {
      setFormMsg({ type: "error", text: err.message });
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this bot?")) return;
    await fetch(`/api/bots?id=${id}`, { method: "DELETE" });
    if (activeBot?._id === id) {
      setActiveBot(null);
      setChat([]);
    }
    await loadBots();
  }

  function selectBot(bot) {
    setActiveBot(bot);
    setChat([]);
  }

  // Send a test message to the selected bot.
  async function onSend() {
    const message = chatInput.trim();
    if (!message || !activeBot) return;

    setChat((c) => [...c, { role: "user", text: message }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: activeBot._id, message }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : `⚠️ ${data.error}`;
      setChat((c) => [...c, { role: "bot", text: reply }]);
    } catch (err) {
      setChat((c) => [...c, { role: "bot", text: `⚠️ ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <>
      <header className="header">
        <h1>🤖 WhatsApp AI Bot Builder</h1>
        <p>Upload a document, create a bot, and chat with it — powered by Groq AI.</p>
      </header>

      <main className="container">
        {/* ---------- LEFT: create a bot ---------- */}
        <section className="card">
          <h2>Create a new bot</h2>

          <label htmlFor="name">Bot name</label>
          <input
            id="name"
            type="text"
            placeholder="e.g. Pizza Shop Helper"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label htmlFor="type">Bot type</label>
          <select
            id="type"
            value={botType}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="custom">Custom</option>
            <option value="support">Customer support</option>
            <option value="faq">FAQ answering</option>
            <option value="sales">Sales assistant</option>
          </select>

          <label htmlFor="prompt">Instructions (personality)</label>
          <textarea
            id="prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />

          <label>Knowledge document (PDF or .txt)</label>
          <div className="file-row">
            <input
              type="file"
              accept=".pdf,.txt,.md"
              onChange={onFileChange}
              disabled={uploading}
            />
            {uploading && <span className="note">Reading…</span>}
          </div>
          {doc && (
            <p className="note">
              ✔ {doc.fileName} ({doc.charCount} characters of knowledge)
            </p>
          )}

          <button className="btn" onClick={onCreate} disabled={creating}>
            {creating ? "Creating…" : "Create bot"}
          </button>

          {formMsg && (
            <div className={`msg ${formMsg.type}`}>{formMsg.text}</div>
          )}
        </section>

        {/* ---------- RIGHT: bots list + test chat ---------- */}
        <section className="card">
          <h2>Your bots</h2>

          {bots.length === 0 && (
            <p className="empty">No bots yet — create one on the left.</p>
          )}

          {bots.map((bot) => (
            <div
              key={bot._id}
              className={`bot-item ${activeBot?._id === bot._id ? "active" : ""}`}
              onClick={() => selectBot(bot)}
            >
              <div>
                <strong>{bot.name}</strong>
                <span className="tag">{bot.botType}</span>
                <div className="meta">
                  {bot.documentName || "no document"}
                </div>
              </div>
              <button
                className="btn btn-small btn-ghost"
                onClick={(e) => onDelete(bot._id, e)}
              >
                Delete
              </button>
            </div>
          ))}

          {activeBot && (
            <>
              <h2 style={{ marginTop: 18 }}>
                Test chat — {activeBot.name}
              </h2>
              <div className="chat">
                {chat.length === 0 && (
                  <p className="empty">Say hi to test your bot 👋</p>
                )}
                {chat.map((m, i) => (
                  <div key={i} className={`bubble ${m.role}`}>
                    {m.text}
                  </div>
                ))}
                {chatLoading && <div className="bubble bot">Typing…</div>}
              </div>
              <div className="chat-input-row">
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSend()}
                />
                <button
                  className="btn"
                  onClick={onSend}
                  disabled={chatLoading}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
