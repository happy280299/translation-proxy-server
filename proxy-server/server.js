import express from "express";
import cors from "cors";
import https from "https";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Fetch Google Sheet using Sheets API
async function fetchGoogleSheet() {
  const spreadsheetId = "1UY7dYDSzMfonEbQsp6TXNn8_rEiKenQS_zdSTRmVGXY";
  const range = "Sheet1!A:C";
  const apiKey = "AIzaSyDyWJaIeS-isNc_-q7495tAoUtfxo0xO1w"; // Public API key

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Parse API response to nested objects
function parseSheetData(apiResponse) {
  console.log("API Response:", JSON.stringify(apiResponse).substring(0, 500));
  const values = apiResponse.values;
  if (!values || values.length < 2) {
    throw new Error(
      `Sheet is empty or has no data rows. Got: ${JSON.stringify(apiResponse).substring(0, 200)}`,
    );
  }

  // Headers: code, en, vi
  const headers = values[0].map((h) => h.toLowerCase());
  const codeIndex = headers.indexOf("code");
  const enIndex = headers.indexOf("en");
  const viIndex = headers.indexOf("vi");

  if (codeIndex === -1 || enIndex === -1 || viIndex === -1) {
    throw new Error(`Missing columns. Found: ${headers.join(", ")}`);
  }

  const en = {};
  const vi = {};

  // Parse data rows
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const code = row[codeIndex];
    const enValue = row[enIndex];
    const viValue = row[viIndex];

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
    const apiResponse = await fetchGoogleSheet();
    const { en, vi } = parseSheetData(apiResponse);

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
