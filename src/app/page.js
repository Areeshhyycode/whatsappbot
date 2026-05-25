"use client";

import { useEffect, useState } from "react";

// Ready-made bot categories. Each one has a starter system prompt the user
// can edit. Pick "Custom" to type your own category name.
const PRESETS = [
  {
    key: "support",
    label: "Customer support",
    prompt:
      "You are a friendly customer support agent. Answer politely using only the company document.",
  },
  {
    key: "faq",
    label: "FAQ answering",
    prompt:
      "You are an FAQ assistant. Give short, clear answers based on the document.",
  },
  {
    key: "sales",
    label: "Sales assistant",
    prompt:
      "You are a helpful sales assistant. Explain products from the document and warmly encourage the customer.",
  },
  {
    key: "ecommerce",
    label: "E-commerce shop",
    prompt:
      "You are an online shop assistant. Help with product info, prices, availability and orders using only the document.",
  },
  {
    key: "restaurant",
    label: "Restaurant / Menu",
    prompt:
      "You are a restaurant menu helper. Describe dishes, ingredients, prices and recommendations from the menu document.",
  },
  {
    key: "education",
    label: "Education / Tutor",
    prompt:
      "You are a patient tutor. Explain concepts clearly with simple examples, using only the document.",
  },
  {
    key: "healthcare",
    label: "Healthcare / Clinic",
    prompt:
      "You are a clinic assistant. Share clinic hours, services, doctors and procedures from the document. Do not give medical advice.",
  },
  {
    key: "booking",
    label: "Booking / Appointments",
    prompt:
      "You are a booking assistant. Help users with appointment availability, services and policies from the document.",
  },
  {
    key: "hr",
    label: "HR assistant",
    prompt:
      "You are an HR assistant. Answer employee questions about policies, benefits and processes from the document.",
  },
  {
    key: "realestate",
    label: "Real estate",
    prompt:
      "You are a real estate assistant. Share property details, prices and availability from the document.",
  },
  {
    key: "personal",
    label: "Personal assistant",
    prompt:
      "You are a personal assistant. Help the user with information from their document — clearly and concisely.",
  },
  {
    key: "custom",
    label: "Custom (type your own)",
    prompt: "You are a helpful WhatsApp assistant.",
  },
];

const PRESET_MAP = Object.fromEntries(PRESETS.map((p) => [p.key, p]));

export default function Home() {
  // --- bot creation form state ---
  const [name, setName] = useState("");
  const [botType, setBotType] = useState("support");
  const [customCategory, setCustomCategory] = useState(""); // user's own category name
  const [systemPrompt, setSystemPrompt] = useState(PRESET_MAP.support.prompt);
  const [doc, setDoc] = useState(null); // { fileName, charCount, text }
  const [pastedText, setPastedText] = useState(""); // alt to file upload
  const [waPhoneId, setWaPhoneId] = useState(""); // WhatsApp Cloud API number id
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState(null); // { type, text }

  // --- bots list + test chat state ---
  const [bots, setBots] = useState([]);
  const [activeBot, setActiveBot] = useState(null);
  const [chat, setChat] = useState([]); // { role: 'user'|'bot', text }
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // --- auth state ---
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // On load: find out who is logged in. If nobody, go to the login page.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setUserEmail(data.user.email);
        setAuthChecked(true);
        loadBots();
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

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
    setSystemPrompt(PRESET_MAP[value]?.prompt || PRESET_MAP.custom.prompt);
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
      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Upload server returned ${res.status} (not JSON). Check the server logs.`
        );
      }
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDoc(data);
      setFormMsg({
        type: "success",
        text: `✔ Loaded "${data.fileName}" — ${data.charCount} characters.`,
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
      // Use the user's typed name when they picked "Custom", otherwise the preset label.
      const finalBotType =
        botType === "custom"
          ? customCategory.trim() || "Custom"
          : PRESET_MAP[botType]?.label || "Custom";

      // Use the uploaded file if present, otherwise the pasted text.
      const effectiveText = doc?.text || pastedText.trim();
      const effectiveName =
        doc?.fileName || (pastedText.trim() ? "Pasted text" : "");

      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          botType: finalBotType,
          systemPrompt,
          documentName: effectiveName,
          documentText: effectiveText,
          whatsappPhoneNumberId: waPhoneId,
        }),
      });
      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Server returned ${res.status} (not JSON). Usually means a missing env var on Vercel or a timeout. Check the function logs.`
        );
      }
      if (!res.ok) throw new Error(data.error || "Could not create bot");

      // The server returns `warning` if the bot was saved but indexing failed.
      if (data.warning) {
        setFormMsg({ type: "error", text: data.warning });
      } else {
        setFormMsg({
          type: "success",
          text: `Bot "${data.bot.name}" created with ${data.bot.chunkCount ?? 0} searchable knowledge chunks!`,
        });
      }
      setName("");
      setDoc(null);
      setPastedText("");
      setWaPhoneId("");
      setCustomCategory("");
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
      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: `Server returned ${res.status} (not JSON)` };
      }
      const reply = res.ok ? data.reply : `⚠️ ${data.error}`;
      setChat((c) => [...c, { role: "bot", text: reply }]);
    } catch (err) {
      setChat((c) => [...c, { role: "bot", text: `⚠️ ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  // Wait until we know the login state, so the UI does not flash.
  if (!authChecked) {
    return <div className="loading-state">Loading…</div>;
  }

  return (
    <>
      <header className="header">
        <div>
          <h1>🤖 WhatsApp AI Bot Builder</h1>
          <p>
            Upload a document, create a bot, and chat with it — powered by Groq AI.
          </p>
        </div>
        <div className="user-box">
          <span>{userEmail}</span>
          <button className="btn btn-small btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
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
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>

          {botType === "custom" && (
            <>
              <label htmlFor="customCat">Your category name</label>
              <input
                id="customCat"
                type="text"
                placeholder="e.g. Wedding planner, Tour guide, Pet shop…"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </>
          )}

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
            <p className="note" style={{ color: "#15803d", fontWeight: 600 }}>
              ✔ {doc.fileName} — {doc.charCount} characters loaded.
            </p>
          )}

          <label htmlFor="pasted">
            Or paste your document text directly
          </label>
          <textarea
            id="pasted"
            rows={5}
            placeholder="Paste the bot's knowledge here if the file upload is acting up — this works even when uploads fail."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
          {pastedText.trim() && (
            <p className="note" style={{ color: "#15803d", fontWeight: 600 }}>
              ✔ {pastedText.length} characters of pasted text ready.
            </p>
          )}

          {!doc && !pastedText.trim() && (
            <p className="note" style={{ color: "#b91c1c" }}>
              ⚠️ No knowledge attached. Upload a file above OR paste text here —
              otherwise the bot has nothing to answer from.
            </p>
          )}

          <label htmlFor="waid">WhatsApp Phone Number ID</label>
          <input
            id="waid"
            type="text"
            placeholder="optional — for the WhatsApp Cloud API"
            value={waPhoneId}
            onChange={(e) => setWaPhoneId(e.target.value)}
          />
          <p className="note">
            Leave empty unless you connected this bot to a WhatsApp Cloud API
            number.
          </p>

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
