import { Pool } from "pg";

const parsedPort = parseInt(process.env.MMOLDB_PORT || "42416");
if (Number.isNaN(parsedPort)) {
  throw new Error(`Invalid MMOLDB_PORT: "${process.env.MMOLDB_PORT}" is not a number`);
}

const pool = new Pool({
  host: process.env.MMOLDB_HOST || "mmoldb.beiju.me",
  port: parsedPort,
  database: process.env.MMOLDB_DATABASE || "mmoldb",
  user: process.env.MMOLDB_USER || "guest",
  // Public guest password for mmoldb.beiju.me. Require explicit env var in production.
  password: process.env.MMOLDB_PASSWORD ?? (process.env.NODE_ENV === "production" ? undefined : "moldybees"),
  application_name: "mmolb-player-builder",
  max: 3,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
  idleTimeoutMillis: 30_000,
  // SSL off: mmoldb.beiju.me is a public game DB with a read-only guest account.
  // Enable ssl: { rejectUnauthorized: false } if the server adds TLS support.
  ssl: false,
});

pool.on("error", (err) => {
  console.error("Unexpected pg pool error:", err.message);
});

export default pool;
