// prisma.config.ts — Prisma 7 configuration file
//
// In Prisma 7, the database URL moved out of schema.prisma and into this file.
// This file is read by `prisma migrate` and `prisma generate`.
// The DATABASE_URL env var is read from .env via dotenv.

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
