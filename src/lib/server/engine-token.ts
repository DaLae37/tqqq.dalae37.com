import "server-only";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

export function createTokenCache(load: () => Promise<string>, now = Date.now) {
  let cached: { token: string; until: number } | null = null;
  let pending: Promise<string> | null = null;
  return {
    clear() { cached = null; },
    async get() {
      if (cached && cached.until > now()) return cached.token;
      if (pending) return pending;
      pending = load().then((raw) => {
        const value: unknown = JSON.parse(raw);
        const token = value && typeof value === "object" && "token" in value ? value.token : null;
        if (typeof token !== "string" || token.length < 32 || token.length > 4096 || /\s/.test(token)) throw new Error("invalid read token");
        cached = { token, until: now() + 60000 };
        return token;
      }).finally(() => { pending = null; });
      return pending;
    },
  };
}

let client: SecretsManagerClient | undefined;
const cache = createTokenCache(async () => {
  const secretId = process.env.ENGINE_READ_API_TOKEN_SECRET_ARN;
  const region = process.env.AWS_REGION ?? "ap-northeast-2";
  if (!secretId || !secretId.startsWith(`arn:aws:secretsmanager:${region}:`)) throw new Error("read secret required");
  client ??= new SecretsManagerClient({ region, maxAttempts: 2 });
  const result = await client.send(new GetSecretValueCommand({ SecretId: secretId, VersionStage: "AWSCURRENT" }),
    { abortSignal: AbortSignal.timeout(3000) });
  if (!result.SecretString) throw new Error("string secret required");
  return result.SecretString;
});

export async function engineToken() {
  if (process.env.NODE_ENV !== "production" && !process.env.ENGINE_READ_API_TOKEN_SECRET_ARN) {
    const token = process.env.ENGINE_READ_API_TOKEN;
    if (token && token.length >= 32 && !/\s/.test(token)) return token;
  }
  return cache.get();
}
export function invalidateEngineToken() { cache.clear(); }
