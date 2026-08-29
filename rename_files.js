const fs = require("fs");
const path = require("path");

function renameRecursive(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (
      file === "node_modules" ||
      file === ".git" ||
      file === "dist" ||
      file === "build"
    )
      continue;

    const oldPath = path.join(dir, file);
    let newName = file;

    // Replace OctopusStudio with OctopusStudio
    newName = newName.replace(/OctopusStudio/g, "OctopusStudio");

    // Replace octopus-studio_ with octopus_studio_
    newName = newName.replace(/octopus-studio_/g, "octopus_studio_");

    // Replace octopus-studio[A-Z] with octopusStudio[A-Z]
    newName = newName.replace(/octopus-studio([A-Z])/g, "octopusStudio$1");

    if (newName !== file) {
      const newPath = path.join(dir, newName);
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed ${oldPath} -> ${newPath}`);

      // If it's a directory, we should recurse into the new path
      if (fs.statSync(newPath).isDirectory()) {
        renameRecursive(newPath);
      }
    } else {
      if (fs.statSync(oldPath).isDirectory()) {
        renameRecursive(oldPath);
      }
    }
  }
}

renameRecursive(process.cwd());
