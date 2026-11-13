import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Dashboard deployment stays separate with no DB, broker or engine control permission", () => {
  const read = (name: string) => JSON.parse(readFileSync(`deploy/ecs/${name}.example.json`, "utf8"));
  const task = read("task-definition"), service = read("service");
  assert.equal(service.cluster, "REPLACE_ECS_CLUSTER");
  assert.equal(task.networkMode, "awsvpc"); assert.equal(service.desiredCount, 1);
  assert.notEqual(task.taskRoleArn, task.executionRoleArn);
  assert.deepEqual(task.containerDefinitions.map((item: { name: string }) => item.name), ["dashboard"]);
  assert.equal(task.containerDefinitions[0].portMappings[0].containerPort, 3000);
  assert.equal(service.networkConfiguration.awsvpcConfiguration.assignPublicIp, "ENABLED");
  assert.equal(service.serviceRegistries.length, 1);
  assert.deepEqual(read("task-role-policy").Statement[0].Action, ["secretsmanager:GetSecretValue"]);
  assert.deepEqual(read("task-role-policy").Statement[0].Resource, ["REPLACE_READ_SECRET_ARN"]);
  assert.equal(JSON.stringify(task).includes("DB_SECRET"), false);
  assert.equal(JSON.stringify(task).includes("MERITZ_SECRET"), false);
  assert.equal(read("discovery-service").DnsConfig.DnsRecords[0].TTL, 10);
});
