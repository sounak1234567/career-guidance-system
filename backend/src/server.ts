import express from "express";
import { configDotenv } from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import profileRoutes from "./routes/profile";

configDotenv();

const app: express.Application = express();
var port: number = 3000;
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/profile", profileRoutes);

if(process.env.NODE_ENV !== "production"){
  port = Number(process.env.PORT) || 3000;
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
