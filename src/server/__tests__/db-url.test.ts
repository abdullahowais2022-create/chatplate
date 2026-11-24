import { describe, expect, it } from "vitest";
import { databaseUrl, directDatabaseUrl } from "../db-url";

describe("databaseUrl", () => {
  it("prefers an exact DATABASE_URL", () => {
    expect(databaseUrl({ DATABASE_URL: " postgresql://a ", POSTGRES_URL: "postgresql://b" })).toBe("postgresql://a");
  });
  it("finds Neon variables created with a custom prefix", () => {
    const env = {
      DATABASE_POSTGRES_URL: "postgresql://pooled",
      DATABASE_POSTGRES_URL_NON_POOLING: "postgresql://direct",
      DATABASE_PGDATABASE: "neondb",
    };
    expect(databaseUrl(env)).toBe("postgresql://pooled");
    expect(directDatabaseUrl(env)).toBe("postgresql://direct");
  });
  it("prefers a prefixed DATABASE_URL over a prefixed POSTGRES_URL", () => {
    expect(databaseUrl({ STORAGE_POSTGRES_URL: "postgresql://b", STORAGE_DATABASE_URL: "postgresql://a" })).toBe("postgresql://a");
  });
  it("returns empty when nothing is configured", () => {
    expect(databaseUrl({ DATABASE_PGDATABASE: "neondb" })).toBe("");
  });
});
