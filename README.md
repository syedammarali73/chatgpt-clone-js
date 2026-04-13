# FullStack AI Chatbot

A full-stack chatbot with a React frontend and an Express backend. The backend uses Groq for responses, Tavily for live web search, and `threadId`-based memory for short conversation history.

## Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, Groq SDK, Tavily, Node Cache

## Project Structure

```text
FullStack-AI-Chatbot/
|-- Frontend/
|-- Backend/
```

## Setup

Install dependencies:

```bash
cd Frontend
npm install

cd ../Backend
npm install
```

Create `Backend/.env`:

```env
PORT=3000
ORIGIN=http://localhost:5173
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
NODE_ENV=development
```

## Run

Backend:

```bash
cd Backend
npm start
```

Frontend:

```bash
cd Frontend
npm run dev
```

## API

### `POST /chat`

Request:

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

Important:

- `message` and `threadId` are both required
- conversation memory is stored by `threadId`
- memory resets when the backend restarts

## Backend Flow

1. The frontend sends `message` and `threadId` to `/chat`.
2. The backend validates the request and normalizes the prompt.
3. `LLM.js` checks for quick replies like greetings.
4. If needed, Groq generates a response.
5. For latest or uncertain information, the model can call Tavily web search.
6. The final reply is returned to the frontend.
