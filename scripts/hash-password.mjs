import { randomBytes, scryptSync } from "node:crypto";

// Read through stdin, never command-line arguments or a checked-in .env.
let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, "");
if (password.length < 16) throw new Error("Use a password containing at least 16 characters");
const salt = randomBytes(16).toString("hex");
console.log(`scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
