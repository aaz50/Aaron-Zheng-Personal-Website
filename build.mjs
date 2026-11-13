import { copyFileSync, cpSync, mkdirSync } from "node:fs";

const output = new URL("./dist/", import.meta.url);
mkdirSync(output, { recursive: true });
for (const name of ["index.html", "style.css", "main.js"]) {
  copyFileSync(new URL(name, import.meta.url), new URL(name, output));
}
cpSync(new URL("./previews/", import.meta.url), new URL("previews/", output), { recursive: true });
