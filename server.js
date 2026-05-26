require("dotenv").config();
const express = require("express");
const sql = require("mssql/msnodesqlv8");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Using 'gemini-flash-latest' which was found in your available models list
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });


// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Load Schema from project_rules.md for AI context
function getDBSchema() {
  try {
    const rules = fs.readFileSync(
      path.join(__dirname, "project_rules.md"),
      "utf8",
    );
    const schemaMatch = rules.match(
      /### Tables Definition\n([\s\S]*?)## AI Prompting Instructions/,
    );
    return schemaMatch ? schemaMatch[1].trim() : "No schema defined.";
  } catch (err) {
    return "No schema defined.";
  }
}

// Health check route
app.get("/api/ping", (req, res) => {
  res.json({ status: "alive" });
});

// Database configuration for Windows Authentication
const config = {
  connectionString:
    "Driver={SQL Server Native Client 11.0};Server=" +
    (process.env.DB_SERVER || "localhost") +
    ";Database=" +
    (process.env.DB_DATABASE || "SO-2016") +
    ";Trusted_Connection=yes;",
  options: {
    trustServerCertificate: true,
  },
};

console.log("Attempting to connect to MSSQL...");

// Global pool variable
let poolPromise = sql
  .connect(config)
  .then((pool) => {
    console.log("Successfully connected to MSSQL (SO-2016)");
    return pool;
  })
  .catch((err) => {
    console.error("CRITICAL: Database Connection Failed!");
    console.error("Error Details:", err.message);
    return null;
  });

// API route to run NLP to SQL query using Gemini
app.post("/api/nlp-query", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res
      .status(400)
      .json({ error: "Natural language prompt is required" });
  }

  try {
      const schema = getDBSchema();

      const systemInstruction = `You are a SQL expert for Microsoft SQL Server. 
      Given the following database schema, translate the user's natural language request into a valid T-SQL SELECT query.

      SCHEMA:
      ${schema}

      RULES:
      - Output ONLY the raw SQL query.
      - DO NOT include markdown formatting.
      - Only generate SELECT queries.
      - Target the database: ${process.env.DB_DATABASE || "SO-2016"}.

      CRITICAL TABLE MAPPING:
      - Use "PostsToTags" for the table connecting Posts and Tags.
      - NEVER use the name "PostTags". It does not exist.
      - Only use table and column names explicitly listed in the SCHEMA above.`;

      const resultAI = await model.generateContent([systemInstruction, prompt]);

    const responseAI = await resultAI.response;

    // Robust cleaning of markdown and whitespace
    let generatedSQL = responseAI.text().trim();
    generatedSQL = generatedSQL
      .replace(/^```(sql)?\n?/i, "")
      .replace(/\n?```$/g, "")
      .trim();

    // Secondary Safety Check: Ensure it's only a SELECT query
    const upperSQL = generatedSQL.toUpperCase();
    const forbiddenKeywords = [
      "INSERT",
      "UPDATE",
      "DELETE",
      "DROP",
      "TRUNCATE",
      "ALTER",
      "CREATE",
      "EXEC",
    ];

    const containsForbidden = forbiddenKeywords.some(
      (keyword) =>
        upperSQL.includes(keyword) &&
        // Ensure it's a standalone keyword, not part of a column name like 'CreatedDate'
        new RegExp(`\\b${keyword}\\b`, "i").test(upperSQL),
    );

    if (containsForbidden || !upperSQL.includes("SELECT")) {
      return res.status(400).json({
        success: false,
        error:
          "Safety Error: Only SELECT queries are permitted. The AI attempted to generate: " +
          generatedSQL,
      });
    }

    // 2. Execute the generated SQL
    const pool = await poolPromise;
    if (!pool) throw new Error("Database connection is not established.");

    const result = await pool.request().query(generatedSQL);

    const MAX_ROWS = 5000;
    const dataToSend = result.recordset
      ? result.recordset.slice(0, MAX_ROWS)
      : [];
    const wasTruncated = result.recordset && result.recordset.length > MAX_ROWS;

    res.json({
      success: true,
      data: dataToSend,
      rowsAffected: result.rowsAffected,
      totalRows: result.recordset ? result.recordset.length : 0,
      truncated: wasTruncated,
      generatedSQL: generatedSQL,
    });
  } catch (err) {
    console.error("Gemini NLP Query error:", err.message);
    res.status(500).json({
      success: false,
      errorType: "Gemini AI Error",
      error: err.message,
    });
  }
});

// API route to run raw query
app.post("/api/query", async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const pool = await poolPromise;
    if (!pool) {
      throw new Error("Database connection is not established.");
    }

    const result = await pool.request().query(query);

    const MAX_ROWS = 5000;
    const dataToSend = result.recordset
      ? result.recordset.slice(0, MAX_ROWS)
      : [];
    const wasTruncated = result.recordset && result.recordset.length > MAX_ROWS;

    res.json({
      success: true,
      data: dataToSend,
      rowsAffected: result.rowsAffected,
      totalRows: result.recordset ? result.recordset.length : 0,
      truncated: wasTruncated,
    });
  } catch (err) {
    console.error("SQL execution error:", err.message);

    let errorType = "Database Error";
    if (err.code === "EREQUEST") {
      errorType = "SQL Syntax/Request Error";
    } else if (err.code === "ETIMEOUT") {
      errorType = "Query Timeout";
    } else if (err.code === "ELOGIN") {
      errorType = "Login Failed";
    }

    res.status(500).json({
      success: false,
      errorType: errorType,
      error: err.message,
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
