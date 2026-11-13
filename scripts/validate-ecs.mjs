import { readFile } from "node:fs/promises";

// Offline validation only. Never registers tasks or changes an AWS service.
const [taskPath, servicePath, cluster] = process.argv.slice(2);
if (!taskPath || !servicePath || !cluster) throw new Error("Usage: node scripts/validate-ecs.mjs task.json service.json cluster");
const task = JSON.parse(await readFile(taskPath, "utf8"));
const service = JSON.parse(await readFile(servicePath, "utf8"));
function check(condition, message) { if (!condition) throw new Error(message); }
check(!JSON.stringify([task, service]).includes("REPLACE_"), "Resolve all deployment placeholders first");
check(service.cluster === cluster && service.launchType === "FARGATE", "Wrong cluster or compute");
check(task.networkMode === "awsvpc" && task.requiresCompatibilities.includes("FARGATE"), "awsvpc/FARGATE required");
check(task.taskRoleArn !== task.executionRoleArn, "Task and execution roles must differ");
check(task.containerDefinitions.length === 1, "Dashboard task must be independent");
const container = task.containerDefinitions[0];
check(container.name === "dashboard" && container.user === "node" && container.stopTimeout >= 30, "Invalid runtime configuration");
check(/^ghcr\.io\/dalae37\/tqqq\.dalae37\.com@sha256:[a-f0-9]{64}$/.test(container.image), "Use a verified Dashboard manifest digest");
check(container.portMappings.length === 1 && container.portMappings[0].containerPort === 3000, "Only dashboard port 3000 allowed");
const env = Object.fromEntries(container.environment.map(({ name, value }) => [name, value]));
check(env.AWS_REGION === "ap-northeast-2" && env.DATA_ADAPTER === "engine", "Wrong region or adapter");
check(!("ENGINE_READ_API_TOKEN" in env) && !("DASHBOARD_PASSWORD_HASH" in env), "No plaintext secret values in task environment");
check(/^arn:aws:secretsmanager:ap-northeast-2:\d{12}:secret:.+/.test(env.ENGINE_READ_API_TOKEN_SECRET_ARN), "Read API Secret ARN required");
const url = new URL(env.ENGINE_API_BASE_URL);
check(url.hostname === env.ENGINE_API_ALLOWED_HOST && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/", "Invalid engine origin");
check(url.protocol === "https:" || env.ENGINE_API_TRANSPORT === "vpc-http" && env.ENGINE_PRIVATE_DNS_SUFFIX &&
  url.hostname.endsWith(`.${env.ENGINE_PRIVATE_DNS_SUFFIX}`) && url.protocol === "http:" && url.port === "8080", "Explicit private HTTP or TLS required");
check(container.secrets.some((secret) => secret.name === "DASHBOARD_USERNAME") && container.secrets.some((secret) => secret.name === "DASHBOARD_PASSWORD_HASH"), "Dashboard auth secret required");
check(service.networkConfiguration.awsvpcConfiguration.assignPublicIp === "ENABLED" && service.networkConfiguration.awsvpcConfiguration.securityGroups.length === 1, "Dedicated Dashboard SG and public-IP egress required");
check(service.serviceRegistries.length === 1 && service.desiredCount === 1, "Initial service requires one task and Cloud Map registration");
check(service.taskDefinition.startsWith(`arn:aws:ecs:ap-northeast-2:`) && service.taskDefinition.includes(`:task-definition/${task.family}:`), "Pin the registered Dashboard task revision");
console.log("Offline Dashboard ECS structure validated; AWS permissions, SG rules, DNS and resource ownership still require verification");
