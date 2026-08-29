import { execFileSync } from "node:child_process";

if (process.platform !== "darwin") {
  console.log(
    `Skipping octopusStudio-keychain-reader rebuild on ${process.platform}; it is macOS-only.`,
  );
  process.exit(0);
}

execFileSync("npm", ["rebuild", "octopusStudio-keychain-reader"], {
  stdio: "inherit",
});
