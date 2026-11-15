import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";

await cp("public", ".next/standalone/public", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
const env = { ...process.env, DATA_ADAPTER: "disabled" };
let upstream, directory;
if (process.argv.includes("--engine")) {
  // Test-only HTTPS upstream and Secrets Manager endpoint. No real account or AWS calls.
  const { mockResource } = await import("../tests/fixtures.ts");
  directory = await mkdtemp(join(tmpdir(), "dashboard-e2e-"));
  const key = join(directory, "key.pem"), cert = join(directory, "cert.pem"), config = join(directory, "openssl.cnf");
  await writeFile(config, "[req]\ndistinguished_name=dn\nx509_extensions=extensions\nprompt=no\n[dn]\nCN=localhost\n[extensions]\nsubjectAltName=IP:127.0.0.1,DNS:localhost\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\nextendedKeyUsage=serverAuth\n");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-config", config, "-keyout", key, "-out", cert], { stdio: "ignore" });
  const token = "synthetic-e2e-engine-secret-must-stay-server-side";
  const secretId = "arn:aws:secretsmanager:ap-northeast-2:000000000000:secret:synthetic-read";
  const resources = new Set(["status", "portfolio", "signals", "orders", "fills", "order-events", "strategy-versions", "annual-pnl", "tax-ledger", "open-orders", "errors", "live", "ready"]);
  upstream = createServer({ key: await readFile(key), cert: await readFile(cert) }, async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.method === "POST" && request.headers["x-amz-target"] === "secretsmanager.GetSecretValue") {
      let body = "";
      for await (const chunk of request) body += chunk;
      if (JSON.parse(body).SecretId !== secretId) { response.writeHead(400).end("{}"); return; }
      response.end(JSON.stringify({ ARN: secretId, SecretString: JSON.stringify({ token }) })); return;
    }
    const url = new URL(request.url, "https://localhost");
    const resource = /^(?:\/v1|\/health)\/([a-z-]+)$/.exec(url.pathname)?.[1];
    if (request.method !== "GET" || (!["live", "ready"].includes(resource) && request.headers.authorization !== `Bearer ${token}`) || !resources.has(resource)) { response.writeHead(403).end("{}"); return; }
    const payload = mockResource(resource, Number(url.searchParams.get("limit") ?? 100), Number(url.searchParams.get("offset") ?? 0));
    if (resource === "status") payload.last_check_at = new Date().toISOString();
    response.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const origin = `https://127.0.0.1:${upstream.address().port}`;
  Object.assign(env, { DATA_ADAPTER: "engine", ENGINE_API_BASE_URL: origin, ENGINE_API_ALLOWED_HOST: "127.0.0.1",
    ENGINE_API_TRANSPORT: "tls", ENGINE_READ_API_TOKEN_SECRET_ARN: secretId, NODE_EXTRA_CA_CERTS: cert,
    AWS_REGION: "ap-northeast-2", AWS_ENDPOINT_URL_SECRETS_MANAGER: origin, AWS_ACCESS_KEY_ID: "synthetic-e2e-access",
    AWS_SECRET_ACCESS_KEY: "synthetic-e2e-secret", AWS_EC2_METADATA_DISABLED: "true" });
  delete env.AWS_SESSION_TOKEN;
}
const child = spawn(process.execPath, [".next/standalone/server.js"], { env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", async (code) => {
  upstream?.close(); upstream?.closeAllConnections();
  if (directory) await rm(directory, { recursive: true, force: true });
  process.exit(code ?? 0);
});
