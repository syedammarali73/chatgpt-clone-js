# FullStack AI Chatbot

This project is a full-stack AI chatbot built with a React frontend and an Express backend. The frontend provides the chat interface, while the backend handles LLM responses, web search, and short-term conversation memory.

## Project Structure

```text
FullStack-AI-Chatbot/
|-- Frontend/
|-- Backend/
```

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Markdown

### Backend

- Node.js
- Express
- Groq SDK
- Tavily
- Node Cache

## Features

- Chat UI built with React
- Backend API for chatbot responses
- Per-thread chat memory using `threadId`
- Quick replies for simple greetings
- Live web search for current information
- Markdown rendering support in the frontend
- Groq tool-calling flow with Tavily integration

## Setup

### 1. Clone the project

```bash
git clone <your-repo-url>
cd FullStack-AI-Chatbot
```

### 2. Install frontend dependencies

```bash
cd Frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../Backend
npm install
```

## Environment Variables

Create a `.env` file inside the `Backend` folder:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
NODE_ENV=development
```

## Running The Project

Open two terminals.

### Terminal 1: Start the backend

```bash
cd Backend
node server.js
```

If you want to use the dev script:

```bash
npm run dev
```

Note: `npm run dev` uses `nodemon`, so install it if needed:

```bash
npm install -D nodemon
```

### Terminal 2: Start the frontend

```bash
cd Frontend
pnpm dev
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Frontend Overview

The frontend is a Vite + React application that provides the chat interface. It sends the user's message and a `threadId` to the backend, then renders the assistant reply in the chat window.

Frontend responsibilities:

- collect user input
- create or reuse a conversation `threadId`
- call the backend `/chat` endpoint
- render assistant replies, including markdown content
- keep the chat UI responsive and readable

Important frontend note:

- The backend now expects both `message` and `threadId` in every `/chat` request. If `threadId` is missing, the backend returns a `400` error.

## Backend Overview

The backend is an Express server that accepts chat requests, normalizes user input, manages short-lived conversation memory, and delegates response generation to `LLM.js`.

Backend responsibilities:

- expose HTTP routes
- validate incoming request data
- normalize user messages before sending them to the model
- maintain chat history by `threadId`
- call Groq for LLM responses
- call Tavily when the model needs real-time web data

### Backend Files

```text
Backend/
|-- server.js
|-- LLM.js
|-- package.json
|-- .env
```

### `server.js`

`server.js` is the API entry point.

It currently does the following:

- starts the Express server on port `3000`
- enables JSON request parsing with `express.json()`
- enables CORS for local frontend origins:
  - `http://localhost:5173`
  - `http://localhost:5174`
- exposes `GET /` as a simple welcome route
- exposes `POST /chat` for chatbot requests

Before sending a request to the LLM layer, the server:

- validates that `message` and `threadId` are present
- converts prompts ending in `.` into questions
- appends `?` if the prompt is missing a question mark

That means a prompt like `tell me about node.js.` becomes a question before it reaches the model as the model is small and it can produce error if not handled.

### `LLM.js`

`LLM.js` contains the chatbot intelligence and tool-calling flow. It connects the Groq model with Tavily web search and caches both conversations and search results.

It is responsible for:

- loading environment variables
- initializing the Groq client
- initializing the Tavily client
- caching conversation history
- caching web search results
- handling quick replies for basic greetings
- deciding when tool calls should be used

### Quick Replies

The `quickReply()` helper handles a few simple messages without calling the model. For example:

- `hi`
- `hello`
- `hey`
- `who are you`

This makes greeting responses faster and avoids unnecessary API calls.

### Conversation Memory

Conversation history is stored in memory using `node-cache` and keyed by `threadId`.

How it works:

- each user conversation has a unique `threadId`
- previous messages for that thread are loaded from cache
- only the most recent messages are kept
- when the assistant finishes, the updated message list is stored back in cache

Current behavior:

- conversation cache TTL is `24 hours`
- recent message history is trimmed to the last `12` messages
- memory resets whenever the backend process restarts

### Web Search Tool

The model can call a tool named `webSearch` when it needs current or uncertain information.

This tool:

- receives a `query`
- cleans the query text
- checks whether the same query already exists in cache
- calls Tavily when no cached result is available
- merges Tavily result snippets into a single text block
- returns the combined content back to the model

Search caching behavior:

- search results are cached for `1 hour`
- repeated real-time questions can reuse cached content
- failed searches return a fallback message instead of crashing the flow

### System Prompt Behavior

The system prompt in `LLM.js` guides the assistant to:

- answer directly when it already knows the answer
- use simple and clear English
- use `webSearch` for current events, news, weather, prices, or uncertain queries
- avoid using the search tool for greetings and older general knowledge

This keeps the chatbot faster for normal questions while still allowing real-time lookups when needed.

## API

### `GET /`

Returns a welcome message.

### `POST /chat`

Send a user prompt to the chatbot.

Request body:

```json
{
  "message": "What is the weather in Mumbai?",
  "threadId": "user-123"
}
```

Response:

```json
{
  "message": "Assistant response here"
}
```

Validation error:

```json
{
  "message": "All fields are required."
}
```

## End-To-End Request Flow

1. The frontend sends `message` and `threadId` to the backend.
2. `server.js` validates the request and normalizes the message into a question if needed.
3. `generate()` in `LLM.js` checks whether the message matches a quick reply.
4. If not, the backend loads recent conversation history from cache using `threadId`.
5. Groq receives the system prompt, chat history, and available `webSearch` tool definition.
6. If the model decides it needs live information, it calls `webSearch`.
7. Tavily returns search results, and the backend sends those results back into the model as tool output.
8. Groq generates the final assistant response.
9. The updated conversation history is saved in cache.
10. The backend returns the final assistant message to the frontend.

## Notes

- Backend memory is stored in RAM, so it resets when the server restarts.
- CORS is currently configured for local frontend origins.
- The frontend and backend should be run from their own folders.
- The backend currently uses the Groq model `llama-3.3-70b-versatile`.
- `LLM.js` includes retry logic for model calls, although the current error path can still be improved.

## Future Improvements

- Add persistent database storage for chat history
- Add authentication
- Add loading states and better error handling in the UI
- Add unit and integration tests
