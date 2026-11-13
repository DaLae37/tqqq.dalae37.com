import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function files(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }))).flat();
}
const markers = ["ENGINE_READ_API_TOKEN", "DASHBOARD_PASSWORD_HASH", "ENGINE_API_BASE_URL", "ENGINE_API_ALLOWED_HOST",
  "ENGINE_READ_API_TOKEN_SECRET_ARN", "SecretsManagerClient", "synthetic-e2e-engine-secret-must-stay-server-side"];
for (const path of await files(".next/static")) {
  if (!path.endsWith(".js")) continue;
  const content = await readFile(path, "utf8");
  for (const marker of markers) if (content.includes(marker)) throw new Error(`Server-only marker in client bundle: ${path}`);
}
console.log("Client bundle: no server configuration or test secret markers");
