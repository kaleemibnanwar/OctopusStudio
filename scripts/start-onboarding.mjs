import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const userDataDir = mkdtempSync(join(tmpdir(), "octopusStudio-onboarding-"));
const nodeStatus = process.env.OCTOPUS_STUDIO_DEV_NODEJS_STATUS || "missing";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

console.log("Starting OctopusStudio onboarding preview");
console.log(`  userData: ${userDataDir}`);
console.log(`  Node.js status: ${nodeStatus}`);

const child = spawn(npmCommand, ["start"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    OCTOPUS_STUDIO_DEV_USER_DATA_DIR: userDataDir,
    OCTOPUS_STUDIO_DEV_NODEJS_STATUS: nodeStatus,
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    const signalCode = signal === "SIGINT" ? 130 : 143;
    process.exit(signalCode);
    return;
  }
  process.exit(code ?? 0);
});
