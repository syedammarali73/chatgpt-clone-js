import express from "express";
import cors from "cors";
import { generate } from "./LLM.js";
const app = express();
const port = 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to chatDPT!");
});

app.post("/chat", async (req, res) => {
  let { message, threadId } = req.body;

  if (!message || !threadId) {
    res.status(400).json({ message: "All fields are required." });
    return;
  }
  if (message.endsWith(".")) {
    message = message.slice(0, -1) + "?";
  } else if (!message.endsWith("?")) {
    message += "?";
  }
  const result = await generate(message, threadId);
  res.json({ message: result });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
