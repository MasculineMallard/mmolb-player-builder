import { Pool } from "pg";

const pool = new Pool({
  host: process.env.MMOLDB_HOST || "mmoldb.beiju.me",
  port: parseInt(process.env.MMOLDB_PORT || "42416"),
  database: process.env.MMOLDB_DATABASE || "mmoldb",
  user: process.env.MMOLDB_USER || "guest",
  password: process.env.MMOLDB_PASSWORD || "moldybees",
  max: 3,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
});

export default pool;
