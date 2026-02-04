#!/usr/bin/env node

/**
 * This script resets the project to a blank state.
 * It either deletes or archives the /app, /components, /hooks, /scripts,
 * and /constants directories to /app-example based on user input, then
 * creates a fresh /app directory with index.tsx and _layout.tsx.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = process.cwd();
const OLD_DIRS = ["app", "components", "hooks", "constants", "scripts"];
const EXAMPLE_DIR = "app-example";
const NEW_APP_DIR = "app";
const EXAMPLE_DIR_PATH = path.join(ROOT, EXAMPLE_DIR);
const NEW_APP_DIR_PATH = path.join(ROOT, NEW_APP_DIR);

const INDEX_CONTENT = `import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
`;

const LAYOUT_CONTENT = `import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const logNextSteps = (keepExample) => {
  const steps = [
    "1. Run `npx expo start` to start a development server.",
    "2. Edit app/index.tsx to edit the main screen.",
  ];

  if (keepExample) {
    steps.push(`3. Delete the /${EXAMPLE_DIR} directory when you're done referencing it.`);
  }

  console.log("\n✅ Project reset complete. Next steps:");
  console.log(steps.join("\n"));
};

const ensureExampleDir = async () => {
  await fs.promises.mkdir(EXAMPLE_DIR_PATH, { recursive: true });
  console.log(`📁 /${EXAMPLE_DIR} directory created.`);
};

const handleExistingDir = async ({ dir, keepExample }) => {
  const oldDirPath = path.join(ROOT, dir);
  if (!fs.existsSync(oldDirPath)) {
    console.log(`➡️ /${dir} does not exist, skipping.`);
    return;
  }

  if (keepExample) {
    const newDirPath = path.join(EXAMPLE_DIR_PATH, dir);
    await fs.promises.rename(oldDirPath, newDirPath);
    console.log(`➡️ /${dir} moved to /${EXAMPLE_DIR}/${dir}.`);
    return;
  }

  await fs.promises.rm(oldDirPath, { recursive: true, force: true });
  console.log(`❌ /${dir} deleted.`);
};

const createFreshApp = async () => {
  await fs.promises.mkdir(NEW_APP_DIR_PATH, { recursive: true });
  console.log("\n📁 New /app directory created.");

  await fs.promises.writeFile(path.join(NEW_APP_DIR_PATH, "index.tsx"), INDEX_CONTENT);
  console.log("📄 app/index.tsx created.");

  await fs.promises.writeFile(path.join(NEW_APP_DIR_PATH, "_layout.tsx"), LAYOUT_CONTENT);
  console.log("📄 app/_layout.tsx created.");
};

const resetProject = async ({ keepExample }) => {
  if (keepExample) {
    await ensureExampleDir();
  }

  for (const dir of OLD_DIRS) {
    await handleExistingDir({ dir, keepExample });
  }

  await createFreshApp();
  logNextSteps(keepExample);
};

const parseKeepExampleInput = (answer) => {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) {
    return "y";
  }

  if (normalized === "y" || normalized === "n") {
    return normalized;
  }

  return null;
};

const promptToKeepExample = () =>
  new Promise((resolve) => {
    rl.question(
      "Do you want to move existing files to /app-example instead of deleting them? (Y/n): ",
      (answer) => resolve(parseKeepExampleInput(answer))
    );
  });

const main = async () => {
  try {
    const userInput = await promptToKeepExample();
    if (!userInput) {
      console.log("❌ Invalid input. Please enter 'Y' or 'N'.");
      return;
    }

    await resetProject({ keepExample: userInput === "y" });
  } catch (error) {
    console.error(`❌ Error during script execution: ${error.message}`);
  } finally {
    rl.close();
  }
};

void main();
