import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

const root = join(import.meta.dir, "..");
const indexPath = "skills/README.md";
const errors: string[] = [];

function isSkillPath(path: string) {
  return path === "skills" || path.startsWith("skills/");
}

function resolveLink(source: string, href: string) {
  const path = href.split(/[?#]/, 1)[0];
  if (!path || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return;

  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    // A filename can contain an unescaped percent sign.
  }
  const base = path.startsWith("/") ? "." : posix.dirname(source);
  return posix.join(base, decodedPath).replace(/\/$/, "");
}

function hasSkillMetadata(markdown: string, folder: string) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown)?.[1];
  if (!frontmatter) return false;
  try {
    const fields = Bun.YAML.parse(frontmatter);
    return (
      fields !== null &&
      typeof fields === "object" &&
      "name" in fields &&
      fields.name === folder &&
      "description" in fields &&
      typeof fields.description === "string" &&
      fields.description.trim() !== ""
    );
  } catch {
    return false;
  }
}

const listing = Bun.spawnSync(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  stderr: "inherit",
});
if (!listing.success) throw new Error("Could not list repository files.");

const files = new Set(listing.stdout.toString().split("\0").filter((path) => path && existsSync(join(root, path))));
const available = new Set([".", ...files]);
const markdownFiles = [...files].filter((path) => path.endsWith(".md") && lstatSync(join(root, path)).isFile()).sort();
const skillFiles = markdownFiles.filter(isSkillPath);
const entryPoints = new Set(skillFiles.filter((path) => posix.basename(path) === "SKILL.md"));
const entryFolders = [...entryPoints].map((path) => posix.dirname(path));
const indexed = new Set<string>();

for (const file of files) {
  for (let folder = posix.dirname(file); !available.has(folder); folder = posix.dirname(folder)) {
    available.add(folder);
  }
}

for (const file of markdownFiles) {
  const markdown = readFileSync(join(root, file), "utf8");
  if (entryPoints.has(file) && !hasSkillMetadata(markdown, posix.basename(posix.dirname(file)))) {
    errors.push(`${file} needs YAML frontmatter with its folder name and a description.`);
  }

  function checkLink(href: string) {
    const target = resolveLink(file, href);
    if (!target || (!isSkillPath(file) && !isSkillPath(target))) return;
    if (!available.has(target)) errors.push(`${file} links to missing repository path ${target}.`);
    return target;
  }

  Bun.markdown.render(markdown, {
    link(_, { href }) {
      const target = checkLink(href);
      if (file === indexPath && target) indexed.add(target);
    },
    image(_, { src }) {
      checkLink(src);
    },
  });
}

if (!skillFiles.includes(indexPath)) errors.push(`Missing ${indexPath}.`);
for (const file of skillFiles) {
  if (file === indexPath) continue;
  if (posix.dirname(file) === "skills") errors.push(`${file} belongs in a category folder.`);
  const isSupportingFile = !entryPoints.has(file) && entryFolders.some((folder) => file.startsWith(`${folder}/`));
  if (!isSupportingFile && !indexed.has(file)) errors.push(`${indexPath} should link to ${file}.`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${skillFiles.length - 1} skill files and their repository links.`);
}
