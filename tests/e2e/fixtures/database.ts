import { randomUUID } from "node:crypto";
import postgres from "postgres";

// The first administrator can be claimed only once. Never reset shared setup state.
export async function createTestDatabase() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database.");
  const sql = postgres(url, { max: 1 });
  const name = `kipivo_test_${randomUUID().replaceAll("-", "")}`;
  const isolated = new URL(url);
  isolated.pathname = `/${name}`;
  try {
    await sql`CREATE DATABASE ${sql(name)}`;
  } catch (error) {
    await sql.end();
    throw error;
  }
  return {
    url: isolated.href,
    async drop() {
      try {
        await sql`DROP DATABASE ${sql(name)}`;
      } finally {
        await sql.end();
      }
    },
  };
}
