import { readFile, writeFile } from "node:fs/promises";

const bundle = new URL(
  "../plugins/mattermost-workflows/dist/server.mjs",
  import.meta.url,
);
const source = await readFile(bundle, "utf8");
await writeFile(bundle, source.replace(/[\t ]+$/gm, ""), "utf8");
