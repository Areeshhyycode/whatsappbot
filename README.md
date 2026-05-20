# 🤖 WhatsApp AI Bot Builder

A website where you upload a **PDF or text document**, create a **WhatsApp bot**, and the
bot answers messages using that document — powered by **Groq AI** (free).

This is a **learning project** built in clear, commented steps.

---

## ✨ What it does

1. Open the website and create a bot (name, type, instructions).
2. Upload a PDF/txt file — the site extracts the text and stores it as the bot's "brain".
3. Test the bot in a live chat panel on the website.
4. Run the WhatsApp worker, scan a QR code, and the bot answers real WhatsApp messages.

---

## 🧱 Tech stack

| Part            | Technology                          |
| --------------- | ----------------------------------- |
| Website + API   | Next.js 16 (App Router)             |
| Database        | MongoDB (via Mongoose)              |
| AI answers      | Groq API — `llama-3.3-70b-versatile`|
| PDF reading     | `pdf-parse`                         |
| WhatsApp        | `whatsapp-web.js`                   |

---

## 📁 Project structure

```
whatAppBot/
├── .env                  # your secrets (git-ignored)
├── .env.example          # template — copy to .env
├── bot/
│   └── index.js          # WhatsApp bot worker (standalone process)
└── src/
    ├── app/
    │   ├── page.js        # the bot builder website
    │   ├── layout.js
    │   ├── globals.css
    │   └── api/
    │       ├── bots/      # create / list / delete bots
    │       ├── upload/    # extract text from a file
    │       └── chat/      # test a bot with Groq
    ├── lib/
    │   ├── mongodb.js     # database connection
    │   ├── groq.js        # AI helper
    │   └── extract.js     # PDF / txt text extraction
    └── models/
        └── Bot.js         # the Bot database schema
```

---

## 🚀 Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Add your secrets

Copy `.env.example` to `.env` and fill in your keys:

```env
GROQ_API_KEY=your_groq_api_key      # from https://console.groq.com
MONGODB_URI=your_mongodb_uri        # from https://www.mongodb.com/atlas
```

Both services have a **free tier** — no credit card needed.

### 3. Run the website

```bash
npm run dev
```

Open <http://localhost:3000>, create a bot, upload a document, and test it in the chat panel.

### 4. Run the WhatsApp bot

In a **second terminal**:

```bash
npm run bot
```

Scan the QR code with WhatsApp → **Settings → Linked Devices**.
Now message that number and the bot replies!

> Use a **spare WhatsApp number** for testing. `whatsapp-web.js` is unofficial,
> and numbers that send spam-like messages can get banned.

---

## 🧠 How it works

```
Website  ──>  /api/upload  ──>  extract text from PDF
         ──>  /api/bots    ──>  save bot + text in MongoDB
         ──>  /api/chat    ──>  Groq AI answers using the text

WhatsApp ──>  bot/index.js ──>  loads bot from MongoDB
                              ──>  Groq AI answers ──> reply
```

The AI is told to answer **only** from the uploaded document.

---

## 🛣️ Roadmap (next learning steps)

- **Phase 3 — real RAG:** instead of sending the whole document, split it into
  chunks, create embeddings, and search for the most relevant pieces. This lets
  bots use large documents accurately.
- **Multiple bots online at once:** one WhatsApp number per bot does not scale —
  the official WhatsApp Cloud API would be the next step.
- **User accounts:** so each person manages only their own bots.

---

## ⚠️ Notes

- `.env` and `.wwebjs_auth/` are git-ignored — never commit them.
- Free Groq tier has rate limits; fine for learning and small bots.
