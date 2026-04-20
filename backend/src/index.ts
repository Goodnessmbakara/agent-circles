import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { poolRoutes } from "./routes/pools.js";
import { txRoutes } from "./routes/tx.js";
import { agentRoutes } from "./routes/agent.js";
import { demoRoutes } from "./routes/demo.js";
import { startKeeper } from "./services/keeper.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.setErrorHandler(errorHandler);

await app.register(poolRoutes, { prefix: "/api" });
await app.register(txRoutes, { prefix: "/api" });
await app.register(agentRoutes, { prefix: "/api" });
await app.register(demoRoutes, { prefix: "/api" });

app.get("/health", async () => ({
  status: "ok",
  /** Set at image build (`Dockerfile.api` GIT_COMMIT) or by the platform (e.g. FLY_IMAGE_REF). */
  commit: process.env.GIT_COMMIT ?? process.env.FLY_IMAGE_REF ?? "unknown",
}));

startKeeper();

app.listen({ port: config.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});

export { app };
