import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId] = useState(() => uuidv4());

  function sendMessage() {
    const text = input.trim();

    if (!text) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        threadId: Date.now(),
        role: "user",
        text,
      },
    ]);

    serverCall(input);
    setInput("");
  }

  async function serverCall(text) {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: text, threadId: threadId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get a response from the server.");
      }
      setLoading(false);

      const result = await response.json();

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: result.message,
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "Something went wrong while contacting the server.",
        },
      ]);
    }
  }
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="bg-neutral-900 text-white overflow-x-hidden min-h-screen">
      <div className="container mx-auto max-w-3xl px-4 pb-44">
        {loading && <div className="my-6 animate-pulse">Thinking...</div>}
        {messages.map((message) => (
          <div
            key={message.threadId}
            className={
              message.role === "user"
                ? "my-6 bg-neutral-800 p-3 rounded-xl ml-auto max-w-fit whitespace-pre-line"
                : "max-w-fit whitespace-pre-line"
            }
          >
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        ))}
        {messages.length == 0 && (
          <div className="fixed inset-x-0 mt-50 flex justify-center text-2xl font-semibold text-white">
            Ready when you are.
          </div>
        )}
        <div
          className={
            messages.length == 0
              ? `fixed inset-x-0 inset-y-0 flex items-center justify-center`
              : `fixed inset-x-0 bottom-0 flex items-center justify-center p-4 bg-neutral-900`
          }
        >
          <div className="bg-neutral-800 p-2 rounded-3xl w-full max-w-3xl">
            <textarea
              id="textarea-input"
              className="w-full resize-none outline-0 p-3 bg-transparent"
              rows="2"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
            />
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={sendMessage}
                className="bg-white text-black px-4 py-1 rounded-full cursor-pointer hover:bg-gray-300"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
