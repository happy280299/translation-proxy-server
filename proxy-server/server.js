import express from "express";
import cors from "cors";
import https from "https";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Fetch Google Sheet CSV using export URL
async function fetchGoogleSheetCSV() {
  const spreadsheetId = "1UY7dYDSzMfonEbQsp6TXNn8_rEiKenQS_zdSTRmVGXY";
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;

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

// Parse CSV
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

function parseSheetData(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("Sheet is empty");
  }

  const headers = parseCSVLine(lines[0]);
  const codeIndex = headers.indexOf("code");
  const enIndex = headers.indexOf("en");
  const viIndex = headers.indexOf("vi");

  const en = {};
  const vi = {};

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (!cells[codeIndex]) continue;

    const code = cells[codeIndex];
    if (cells[enIndex]) setNested(en, code, cells[enIndex]);
    if (cells[viIndex]) setNested(vi, code, cells[viIndex]);
  }

  return { en, vi };
}

function setNested(obj, path, value) {
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
    const csv = await fetchGoogleSheetCSV();
    const { en, vi } = parseSheetData(csv);

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
