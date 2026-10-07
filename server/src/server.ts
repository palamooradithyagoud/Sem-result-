import { app } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { bootstrapAdmin } from "./services/bootstrapAdmin.js";

async function start() {
  await connectDatabase();
  await bootstrapAdmin();
  app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
