"use strict";
// prisma.config.ts — Prisma 7 configuration file
//
// In Prisma 7, the database URL moved out of schema.prisma and into this file.
// This file is read by `prisma migrate` and `prisma generate`.
// The DATABASE_URL env var is read from .env via dotenv.
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: (0, config_1.env)("DATABASE_URL"),
    },
});
