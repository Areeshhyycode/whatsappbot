# 🤖 WhatsApp AI Bot Builder

A website where users **sign up**, upload a **PDF or text document**, and create a
**WhatsApp bot** that answers messages from that document — powered by **Groq AI**.

This is a **learning project** built in clear, commented steps.

---

## ✨ What it does

1. Sign up / log in — each user only sees their own bots.
2. Create a bot (name, type, instructions) and upload a PDF/txt file.
3. The document is split, embedded, and stored in a vector database.
4. Test the bot in a live chat panel on the website.
5. Connect it to WhatsApp — either the quick way (`whatsapp-web.js`) or the
   official **WhatsApp Cloud API**.

---

## 🧱 Tech stack

| Part           | Technology                                       |
| -------------- | ------------------------------------------------ |
| Website + API  | Next.js 16 (App Router)                          |
| Database       | MongoDB Atlas (via Mongoose)                     |
| Accounts       | bcrypt password hashing + JWT cookie             |
| AI answers     | Groq API — `llama-3.3-70b-versatile`             |
| PDF reading    | `pdf-parse`                                      |
| Embeddings     | `@huggingface/transformers` (local, free)        |
| Vector search  | MongoDB Atlas Vector Search (`$vectorSearch`)    |
| WhatsApp       | `whatsapp-web.js` **or** WhatsApp Cloud API      |

---

## 📁 Project structure

```
whatAppBot/
├── .env                    # your secrets (git-ignored)
├── .env.example            # template — copy to .env
├── bot/index.js            # WhatsApp worker (whatsapp-web.js)
├── scripts/create-index.js # one-time: create the vector search index
└── src/
    ├── app/
    │   ├── page.js          # the bot builder website
    │   ├── login/page.js    # login / signup page
    │   └── api/
    │       ├── auth/        # signup, login, logout, me
    │       ├── bots/        # create / list / delete bots
    │       ├── upload/      # extract text from a file
    │       ├── chat/        # test a bot with Groq
    │       └── whatsapp/webhook/   # WhatsApp Cloud API webhook
    ├── lib/                 # mongodb, auth, groq, extract, chunk,
    │                        #   embeddings, rag, whatsapp
    └── models/              # User, Bot, Chunk
```

---

## 🚀 Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Add your secrets

Copy `.env.example` to `.env` and fill it in:

```env
GROQ_API_KEY=...     # free — https://console.groq.com
MONGODB_URI=...      # free — https://www.mongodb.com/atlas
JWT_SECRET=...        # any long random string
```

### 3. Create the vector search index (one time)

```bash
npm run setup-index
```

This builds the Atlas Vector Search index. It takes about a minute.
*(The app still works before this — it falls back to in-memory search.)*

### 4. Run the website

```bash
npm run dev
```

Open <http://localhost:3000>, sign up, create a bot, upload a document,
and test it in the chat panel.

### 5. Connect WhatsApp

**Option A — quick (whatsapp-web.js):** in a second terminal:

```bash
npm run bot
```

Scan the QR code with WhatsApp → **Settings → Linked Devices**.

> Use a **spare number**. `whatsapp-web.js` is unofficial and spam-like
> activity can get a number banned.

**Option B — official (WhatsApp Cloud API):**

1. Create a free app at <https://developers.facebook.com> → add WhatsApp.
2. Put your access token in `.env` as `WHATSAPP_TOKEN`, and pick any
   `WHATSAPP_VERIFY_TOKEN`.
3. Expose your local server with a tunnel (e.g. `ngrok http 3000`) and set the
   webhook URL to `https://YOUR-URL/api/whatsapp/webhook`, using the same
   verify token. Subscribe to the **messages** field.
4. On the website, paste the Meta **Phone Number ID** into the bot's
   "WhatsApp Phone Number ID" field. Incoming messages route to that bot.

---

## 🧠 How it works (RAG + vector search)

```
Creating a bot:
  document  →  split into chunks  →  embed each chunk
            →  store chunks in the "chunks" collection (vector DB)

Answering a question:
  question  →  embed it  →  Atlas $vectorSearch finds the closest chunks
            →  send only those chunks + question to Groq AI  →  reply
```

Embeddings turn text into numbers that capture meaning, so the bot searches a
large document by **meaning** and sends only the relevant parts to the AI.
The embedding model runs locally (free, no key) — the first run downloads it
(~25 MB) and caches it.

If the Atlas index is missing, the app automatically falls back to in-memory
cosine-similarity search, so it always works.

---

## 🛣️ Roadmap

- ✅ **RAG** — documents are chunked, embedded and searched.
- ✅ **User accounts** — each user manages only their own bots.
- ✅ **WhatsApp Cloud API** — official, webhook-based, no browser needed.
- ✅ **Vector database** — Atlas Vector Search for large documents.
- **Next:** deploy publicly, conversation memory, multiple documents per bot.

---

## ⚠️ Notes

- `.env`, `.wwebjs_auth/` and `.cache/` are git-ignored — never commit them.
- Free Groq tier has rate limits; fine for learning and small bots.
- The WhatsApp Cloud API free tier still uses one phone number per bot — the
  webhook just routes each number to the right bot.
