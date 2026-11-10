import { Script } from "node:vm";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const client = readFileSync(join(root, "templates", "client.js"), "utf8");
new Script(client, { filename: "templates/client.js" });
mkdirSync(join(root, "lib"), { recursive: true });
writeFileSync(join(root, "lib", "client.js"), client, "utf8");
console.log("lib/client.js generated");
