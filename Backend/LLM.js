import Groq from "groq-sdk";
import dotenv from "dotenv";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";

dotenv.config();

// 🔹 Init
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: `${process.env.TAVILY_API_KEY}` });
// Cache: conversations + search
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });
// 🔹 Constants
const MAX_RETRIES = 6;
const MAX_MESSAGES = 12;
// ===============================
// ✅ Quick Reply (NO API CALL)
// ===============================
function quickReply(message) {
  const msg = message.trim().toLowerCase();

  if (["hi", "hello", "hey", "hii", "helo"].includes(msg)) {
    return "How can I assist you?";
  }

  if (msg === "who are you") {
    return "I am your smart personal assistant.";
  }

  return null;
}

// ===============================
// 🌐 Web Search with Cache
// ===============================
async function webSearch({ query }) {
  // Here we will do tavily api call

  const cleanQuery = query.trim().replace(/[?.!]$/, "");
  const cacheKey = `search:${cleanQuery}`;

  // console.log("Calling web search");
  // console.log("query");
  // console.log(query);

  // ✅ Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    if (process.env.NODE_ENV === "development") {
      console.log("Using cached search:", cleanQuery);
    }
    return cached;
  }

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("Calling web search:", cleanQuery);
    }
    const response = await tvly.search(`${cleanQuery}`);

    const result =
      response?.results?.map((r) => r.content).join("\n\n") ||
      "No results found.";

    // Cache for 1 hour
    cache.set(cacheKey, result, 60 * 60);

    return result;
  } catch (err) {
    console.error("WebSearch error:", err.message);
    return "Failed to fetch search results.";
  }
}

// ===============================
// 🤖 Main Generate Function
// ===============================
export async function generate(userMessage, threadId) {
  // ✅ 1. Quick reply (skip Groq)
  const quick = quickReply(userMessage);
  if (quick) return quick;

  // ===============================
  // Base system prompt
  // ===============================
  const baseMessages = [
    {
      role: "system",
      content: `You are a smart personal assistant.
      Rules:
      
      - Answer directly if you know the answer.
      - Use simple, clear English.
      - Only use webSearch if:
        The query is about current events, news, weather, prices, or real-time info
        OR you are unsure of the answer
      Do NOT use webSearch for:
      - greetings
      - general knowledge before December 6, 2024.
      - Do not mention the tool unless required.

      
      Decide when to use your own knowledge and when to use the tool.
      Do not mention the tool unless needed.

      Examples:
      Q: What is the capital of France?
      A: The capital of France is Paris.

      Q: What is the capital of India ?
      A: The capital of India is Delhi.

      Q: What is the capital of Maharashtra
      A: The capital of Maharashtra is Mumbai.

      Q: What's the weather in Mumbai right now?
      A: (use the search tool to find the latest weather)

      Q: Tell me the latest IT news.
      A: (use the search tool to get the latest news)

      current date and time: ${new Date().toUTCString()}`,
    },
  ];

  // ===============================
  // Conversation Memory
  // ===============================
  let messages = cache.get(threadId) ?? baseMessages;

  // Trim old messages
  messages = messages.slice(-MAX_MESSAGES);

  messages.push({
    role: "user",
    content: userMessage,
  });

  // ===============================
  // Retry Loop
  // ===============================
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const completions = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: messages,
        tools: [
          {
            type: "function",
            function: {
              name: "webSearch",
              description:
                "Search the latest information and real-time data on the internet",
              parameters: {
                // JSON Schema object
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Search query",
                  },
                },
                required: ["query"],
              },
            },
          },
        ],
        tool_choice: "auto",
      });
      const message = completions.choices[0].message;
      messages.push(message);
      const toolCalls = message.tool_calls;

      // ✅ No tool call → final response from assistant
      if (!toolCalls) {
        cache.set(threadId, messages);

        return message.content;
      }
      // ===============================
      // Handle Tool Calls
      // ===============================
      for (const tool of toolCalls) {
        //   console.log("tool: ", tool);
        const functionName = tool.function.name;
        const functionParams = tool.function.arguments;

        if (functionName === "webSearch") {
          const toolResult = await webSearch(JSON.parse(functionParams));
          // console.log("Tool result:", toolResult);

          messages.push({
            tool_call_id: tool.id,
            role: "tool",
            name: functionName,
            content: toolResult,
          });
        }
      }
    } catch (error) {
      if (attempt > MAX_RETRIES) {
        return "I Could not find the result, please try again";
      }
    }
  }
}
