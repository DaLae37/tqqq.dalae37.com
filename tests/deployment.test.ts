import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("Dashboard deployment stays separate with no DB, broker or engine control permission", () => {
  const read = (name: string) => JSON.parse(readFileSync(`deploy/ecs/${name}.example.json`, "utf8"));
  const task = read("task-definition"), service = read("service");
  assert.equal(service.cluster, "REPLACE_ECS_CLUSTER");
  assert.equal(task.networkMode, "awsvpc"); assert.equal(service.desiredCount, 1);
  assert.notEqual(task.taskRoleArn, task.executionRoleArn);
  assert.deepEqual(task.containerDefinitions.map((item: { name: string }) => item.name), ["dashboard", "cloudflared"]);
  assert.equal(task.containerDefinitions[0].portMappings[0].containerPort, 3000);
  assert.equal(task.containerDefinitions[0].secrets, undefined);
  const tunnel = task.containerDefinitions[1];
  assert.equal(tunnel.image, "cloudflare/cloudflared:latest");
  assert.equal(tunnel.essential, true);
  assert.deepEqual(tunnel.command, ["tunnel", "--no-autoupdate", "run"]);
  assert.deepEqual(tunnel.dependsOn, [{ containerName: "dashboard", condition: "HEALTHY" }]);
  assert.deepEqual(tunnel.portMappings, []);
  assert.deepEqual(tunnel.secrets, [{ name: "TUNNEL_TOKEN", valueFrom: "REPLACE_CLOUDFLARE_TUNNEL_TOKEN_SECRET_ARN" }]);
  assert.ok(read("execution-role-policy").Statement[1].Resource.includes("REPLACE_CLOUDFLARE_TUNNEL_TOKEN_SECRET_ARN"));
  assert.equal(JSON.stringify(read("task-role-policy")).includes("CLOUDFLARE"), false);
  assert.equal(service.networkConfiguration.awsvpcConfiguration.assignPublicIp, "ENABLED");
  assert.equal(service.serviceRegistries.length, 1);
  assert.deepEqual(read("task-role-policy").Statement[0].Action, ["secretsmanager:GetSecretValue"]);
  assert.deepEqual(read("task-role-policy").Statement[0].Resource, ["REPLACE_READ_SECRET_ARN"]);
  assert.equal(JSON.stringify(task).includes("DB_SECRET"), false);
  assert.equal(JSON.stringify(task).includes("MERITZ_SECRET"), false);
  assert.equal(read("discovery-service").DnsConfig.DnsRecords[0].TTL, 10);
});


test("offline validation supports the tunnel and rejects unsafe sidecar configuration", () => {
  const directory = mkdtempSync(join(tmpdir(), "dashboard-ecs-"));
  const values: Record<string, string> = {
    REPLACE_DASHBOARD_FAMILY: "synthetic-dashboard",
    REPLACE_DASHBOARD_TASK_ROLE_ARN: "arn:aws:iam::000000000000:role/synthetic-task",
    REPLACE_DASHBOARD_EXECUTION_ROLE_ARN: "arn:aws:iam::000000000000:role/synthetic-execution",
    REPLACE_VERIFIED_IMAGE_DIGEST: `ghcr.io/dalae37/tqqq.dalae37.com@sha256:${"0".repeat(64)}`,
    REPLACE_ENGINE_FQDN: "engine.example.invalid",
    REPLACE_READ_SECRET_ARN: "arn:aws:secretsmanager:ap-northeast-2:000000000000:secret:synthetic-read",
    REPLACE_CLOUDFLARE_TUNNEL_TOKEN_SECRET_ARN: "arn:aws:secretsmanager:ap-northeast-2:000000000000:secret:synthetic-tunnel",
    REPLACE_ECS_CLUSTER: "synthetic-cluster",
    REPLACE_DASHBOARD_TASK_REVISION: "arn:aws:ecs:ap-northeast-2:000000000000:task-definition/synthetic-dashboard:1",
  };
  const render = (name: string) => readFileSync(`deploy/ecs/${name}.example.json`, "utf8")
    .replace(/REPLACE_[A-Z_]+/g, (key) => values[key] ?? "synthetic");
  const task = JSON.parse(render("task-definition"));
  const taskPath = join(directory, "task.json"), servicePath = join(directory, "service.json");
  writeFileSync(servicePath, render("service"));
  function validate() {
    writeFileSync(taskPath, JSON.stringify(task));
    return execFileSync(process.execPath, ["scripts/validate-ecs.mjs", taskPath, servicePath, "synthetic-cluster"], { stdio: "pipe" });
  }
  try {
    assert.match(validate().toString(), /structure validated/);
    const tunnel = task.containerDefinitions[1];
    tunnel.environment = [{ name: "TUNNEL_TOKEN", value: "synthetic-token" }];
    assert.throws(validate);
    delete tunnel.environment;
    tunnel.command.push("--token", "synthetic-token");
    assert.throws(validate);
    tunnel.command = ["tunnel", "--no-autoupdate", "run"];
    tunnel.portMappings = [{ containerPort: 7844 }];
    assert.throws(validate);
    tunnel.portMappings = [];
    tunnel.dependsOn = [];
    assert.throws(validate);
    task.containerDefinitions = [task.containerDefinitions[0]];
    assert.match(validate().toString(), /structure validated/);
    task.containerDefinitions.push({ name: "engine" });
    assert.throws(validate);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
