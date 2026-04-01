import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy for OpenProject API to avoid CORS and keep API key secure
  app.get("/api/openproject/*", async (req, res) => {
    // Priority: Headers (from UI Settings) > .env variables > Hardcoded default
    const clientUrl = req.header("x-openproject-url")?.trim();
    const clientApiKey = req.header("x-openproject-api-key")?.trim();

    const url = clientUrl || process.env.OPENPROJECT_URL?.trim() || "https://project.intermesh.net";
    const apiKey = clientApiKey || process.env.OPENPROJECT_API_KEY?.trim();

    if (!apiKey) {
      console.error("OpenProject API key missing");
      return res.status(401).json({ error: "OpenProject API key or instance URL is missing. Please check your config in Settings." });
    }

    const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    const pathPart = req.params[0];
    const query = new URLSearchParams(req.query as any).toString();
    const targetUrl = `${baseUrl}/api/v3/${pathPart}${query ? "?" + query : ""}`;
    console.log(`[PROXY] Fetching: ${targetUrl}`);

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "Authorization": `Basic ${Buffer.from(`apikey:${apiKey}`).toString("base64")}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      console.log(`[PROXY] Response: ${response.status} ${response.statusText}`);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        res.status(response.status).send(text);
      }
    } catch (error) {
      console.error("OpenProject API Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to OpenProject. Please check if the URL is correct and accessible." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
