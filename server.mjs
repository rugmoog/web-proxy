import express from "express";
import { chromium } from "playwright";

const configuredOrigin = process.env.ALLOWED_ORIGIN;
if (!configuredOrigin) {
  throw new Error("Set ALLOWED_ORIGIN to the HTTPS origin you control.");
}

const parsedOrigin = new URL(configuredOrigin);
if (parsedOrigin.protocol !== "https:") {
  throw new Error("ALLOWED_ORIGIN must use HTTPS.");
}
const allowedOrigin = parsedOrigin.origin;

const app = express();
app.use(express.static("public"));

app.use(express.json({ limit: "2kb" }));

let browser;
let context;
let page;

function permittedUrl(input) {
  try {
    const url = new URL(input);
    return url.protocol === "https:" && url.origin === allowedOrigin ? url : null;
  } catch {
    return null;
  }
}

async function runNavigation(res, action) {
  try {
    await action();
    res.json({ url: page.url() });
  } catch (error) {
    res.status(502).json({ error: "Navigation failed", detail: error.message });
  }
}

app.get("/api/status", (_req, res) => {
  res.json({ url: page.url(), allowedOrigin });
});

app.get("/api/screen", async (_req, res) => {
  try {
    const image = await page.screenshot({ type: "png" });
    res.type("png").send(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.post("/api/navigate", async (req, res) => {
  const target = permittedUrl(req.body?.url);
  if (!target) {
    return res.status(400).json({
      error: `Enter an HTTPS URL on the allowed origin: ${allowedOrigin}`,
    });
  }

  await runNavigation(res, () =>
    page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 20000 })
  );
});

app.post("/api/back", async (_req, res) =>
  runNavigation(res, () => page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 }))
);

app.post("/api/forward", async (_req, res) =>
  runNavigation(res, () => page.goForward({ waitUntil: "domcontentloaded", timeout: 15000 }))
);

const allowedKeys = new Set([
  "Enter", "Tab", "Escape", "Backspace", "Delete",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Home", "End", "PageUp", "PageDown", "Space"
]);

app.post("/api/input/click", async (req, res) => {
  const x = Number(req.body?.x);
  const y = Number(req.body?.y);

  if (!Number.isFinite(x) || !Number.isFinite(y) ||
      x < 0 || x > 1280 || y < 0 || y > 720) {
    return res.status(400).json({ error: "Click coordinates are out of bounds." });
  }

  await runNavigation(res, () => page.mouse.click(x, y));
});

app.post("/api/input/type", async (req, res) => {
  const text = req.body?.text;

  if (typeof text !== "string" || text.length > 500) {
    return res.status(400).json({ error: "Text must be 500 characters or fewer." });
  }

  await runNavigation(res, () => page.keyboard.type(text));
});

app.post("/api/input/key", async (req, res) => {
  const key = req.body?.key;

  if (!allowedKeys.has(key)) {
    return res.status(400).json({ error: "That key is not enabled." });
  }

  await runNavigation(res, () => page.keyboard.press(key));
});



app.post("/api/reload", async (_req, res) =>
  runNavigation(res, () => page.reload({ waitUntil: "domcontentloaded", timeout: 15000 }))
);

async function start() {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
  serviceWorkers: "block",
  viewport: { width: 1280, height: 720 }
});


  // Keep this prototype to one tab.
  page = await context.newPage();
  context.on("page", (newPage) => {
    if (newPage !== page) newPage.close().catch(() => {});
  });

  // Allow ordinary page requests only to the configured origin.
  await context.route("**/*", async (route) => {
    try {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === allowedOrigin) {
        await route.continue();
      } else {
        await route.abort();
      }
    } catch {
      await route.abort();
    }
  });

  await page.goto(allowedOrigin, {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });

  const requestedPort = Number(process.env.PORT || 8000);

const server = app.listen(requestedPort, "0.0.0.0", () => {
  const address = server.address();
  const actualPort =
    typeof address === "object" && address !== null
      ? address.port
      : requestedPort;

  console.log(`Server running on port ${actualPort}`);
  console.log("Type 'stop' and press enter to stop the server.")
});

}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

let stopping = false;

async function shutdown() {
  if (stopping) return;
  stopping = true;

  console.log("Stopping server...");
  try {
    await browser?.close();
  } catch {}

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

let inputBuffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
  const lines = inputBuffer.split(/\r?\n/);
  inputBuffer = lines.pop() ?? "";

  for (const line of lines) {
    if (line.trim().toLowerCase() === "stop") {
      void shutdown();
    }
  }
});

