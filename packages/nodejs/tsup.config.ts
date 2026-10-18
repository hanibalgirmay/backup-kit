import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/express": "src/adapters/express.ts",
    "adapters/fastify": "src/adapters/fastify.ts",
    "adapters/koa": "src/adapters/koa.ts",
    "adapters/hono": "src/adapters/hono.ts",
    "adapters/nestjs/index": "src/adapters/nestjs/BackupModule.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "node18",
  outDir: "dist",
});
