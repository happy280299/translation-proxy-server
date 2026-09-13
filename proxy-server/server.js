import express from "express";
import cors from "cors";
import https from "https";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Fetch Google Sheet data as CSV
async function fetchGoogleSheet() {
  const spreadsheetId = "1UY7dYDSzMfonEbQsp6TXNn8_rEiKenQS_zdSTRmVGXY";
  const sheetId = "0";
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetId}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

// Parse CSV to nested objects
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV is empty or has no data rows");
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const codeIndex = headers.findIndex((h) => h.toLowerCase() === "code");
  const enIndex = headers.findIndex((h) => h.toLowerCase() === "en");
  const viIndex = headers.findIndex((h) => h.toLowerCase() === "vi");

  if (codeIndex === -1 || enIndex === -1 || viIndex === -1) {
    throw new Error(`Missing columns. Found: ${headers.join(", ")}`);
  }

  const en = {};
  const vi = {};

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length === 0 || !cells[codeIndex]) continue;

    const code = cells[codeIndex];
    const enValue = cells[enIndex];
    const viValue = cells[viIndex];

    if (code && enValue) {
      setNestedProperty(en, code, enValue);
    }
    if (code && viValue) {
      setNestedProperty(vi, code, viValue);
    }
  }

  return { en, vi };
}

function setNestedProperty(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// Endpoint: Sync translations
app.post("/sync-translations", async (req, res) => {
  try {
    const csv = await fetchGoogleSheet();
    const { en, vi } = parseCSV(csv);

    res.json({
      success: true,
      message: "Translations synced successfully!",
      data: { en, vi },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
