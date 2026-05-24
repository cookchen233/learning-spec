#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const errors = [];
const warnings = [];

function fail(file, message) {
  errors.push({ file, message });
}

function warn(file, message) {
  warnings.push({ file, message });
}

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function list(dir) {
  return fs.readdirSync(dir, { withFileTypes: true });
}

function parseFrontmatter(file) {
  const text = read(file);
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    fail(file, "missing YAML frontmatter");
    return { data: {}, body: text };
  }
  return { data: parseYamlSubset(match[1]), body: text.slice(match[0].length) };
}

function parseYamlSubset(src) {
  const data = {};
  const lines = src.split(/\r?\n/);
  let currentKey = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      const value = keyMatch[2] ?? "";
      if (value === "" || value === "[]") {
        data[currentKey] = [];
      } else {
        data[currentKey] = stripQuotes(value);
      }
      continue;
    }
    const itemMatch = line.match(/^\s*-\s*(.*)$/);
    if (itemMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(stripQuotes(itemMatch[1]));
    }
  }
  return data;
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [String(value)];
}

function requireKeys(file, data, keys) {
  for (const key of keys) {
    if (!(key in data)) fail(file, `frontmatter missing required key: ${key}`);
  }
}

if (!exists(root)) {
  console.error(`learning spec root does not exist: ${root}`);
  process.exit(2);
}

const projectFile = path.join(root, "project-contract.md");
if (!exists(projectFile)) fail(projectFile, "missing project-contract.md");

let projectId = null;
if (exists(projectFile)) {
  const { data } = parseFrontmatter(projectFile);
  requireKeys(projectFile, data, ["project_id"]);
  projectId = data.project_id;
}

const levelDirs = list(root).filter((e) => e.isDirectory() && /^level-\d{2}-[a-z0-9][a-z0-9-]*$/.test(e.name));
if (levelDirs.length === 0) fail(root, "must contain at least one level-NN-slug directory");

const levels = new Map();
const zones = new Map();
const capabilities = new Map();
const tasks = new Map();

for (const levelDir of levelDirs) {
  const levelPath = path.join(root, levelDir.name);
  const levelFile = path.join(levelPath, "level.md");
  if (!exists(levelFile)) {
    fail(levelFile, "missing level.md");
    continue;
  }
  const level = validateLevel(levelFile, levelDir.name);
  if (level.id) levels.set(level.id, level);

  const stateFile = path.join(levelPath, "execution-state.md");
  if (exists(stateFile)) validateExecutionState(stateFile, levelDir.name);

  const zoneDirs = list(levelPath).filter((e) => e.isDirectory() && /^zone-\d{2}-[a-z0-9][a-z0-9-]*$/.test(e.name));
  for (const zoneDir of zoneDirs) {
    const zonePath = path.join(levelPath, zoneDir.name);
    const zoneFile = path.join(zonePath, "zone.md");
    if (!exists(zoneFile)) {
      fail(zoneFile, "missing zone.md");
      continue;
    }
    const zone = validateZone(zoneFile, zoneDir.name, levelDir.name);
    if (zone.id) zones.set(zone.id, zone);

    const capabilityDirs = list(zonePath).filter((e) => e.isDirectory() && /^capability-\d{2}-[a-z0-9][a-z0-9-]*$/.test(e.name));
    for (const capabilityDir of capabilityDirs) {
      const capabilityPath = path.join(zonePath, capabilityDir.name);
      const capabilityFile = path.join(capabilityPath, "capability.md");
      if (!exists(capabilityFile)) {
        fail(capabilityFile, "missing capability.md");
        continue;
      }
      const capability = validateCapability(capabilityFile, capabilityDir.name, levelDir.name, zoneDir.name);
      if (capability.id) capabilities.set(capability.id, capability);

      const taskFiles = list(capabilityPath).filter((e) => e.isFile() && /^task-\d{2}-.+\.md$/.test(e.name));
      for (const taskFile of taskFiles) {
        const taskPath = path.join(capabilityPath, taskFile.name);
        const task = validateTask(taskPath, levelDir.name, zoneDir.name, capabilityDir.name);
        if (task.id) tasks.set(task.id, task);
      }
    }
  }
}

validateCrossRefs(levels, zones, capabilities, tasks);

function validateLevel(file, dirName) {
  const { data } = parseFrontmatter(file);
  requireKeys(file, data, ["id", "project", "depends_on", "zones"]);
  if (projectId && data.project !== projectId) fail(file, `project must equal project_id (${projectId})`);
  if (data.id !== dirName) fail(file, `level.id must equal directory name (${dirName})`);
  return { id: data.id, dependsOn: asArray(data.depends_on), zones: asArray(data.zones), file };
}

function validateZone(file, dirName, levelName) {
  const { data } = parseFrontmatter(file);
  requireKeys(file, data, ["id", "project", "level", "depends_on", "capabilities"]);
  if (projectId && data.project !== projectId) fail(file, `project must equal project_id (${projectId})`);
  if (data.id !== dirName) fail(file, `zone.id must equal directory name (${dirName})`);
  if (data.level !== levelName) fail(file, `zone.level must equal parent level directory (${levelName})`);
  return { id: data.id, level: data.level, dependsOn: asArray(data.depends_on), capabilities: asArray(data.capabilities), file };
}

function validateCapability(file, dirName, levelName, zoneName) {
  const { data } = parseFrontmatter(file);
  requireKeys(file, data, ["id", "project", "level", "zone", "depends_on", "tasks"]);
  if (projectId && data.project !== projectId) fail(file, `project must equal project_id (${projectId})`);
  if (data.id !== dirName) fail(file, `capability.id must equal directory name (${dirName})`);
  if (data.level !== levelName) fail(file, `capability.level must equal parent level directory (${levelName})`);
  if (data.zone !== zoneName) fail(file, `capability.zone must equal parent zone directory (${zoneName})`);
  return { id: data.id, level: data.level, zone: data.zone, dependsOn: asArray(data.depends_on), tasks: asArray(data.tasks), file };
}

function validateTask(file, levelName, zoneName, capabilityName) {
  const { data } = parseFrontmatter(file);
  requireKeys(file, data, ["id", "project", "level", "zone", "capability", "depends_on"]);
  if (projectId && data.project !== projectId) fail(file, `project must equal project_id (${projectId})`);
  const filename = path.basename(file, ".md");
  if (data.id !== filename) fail(file, `task.id must equal filename (${filename})`);
  if (data.level !== levelName) fail(file, `task.level must equal parent level directory (${levelName})`);
  if (data.zone !== zoneName) fail(file, `task.zone must equal parent zone directory (${zoneName})`);
  if (data.capability !== capabilityName) fail(file, `task.capability must equal parent capability directory (${capabilityName})`);
  return { id: data.id, level: data.level, zone: data.zone, capability: data.capability, dependsOn: asArray(data.depends_on), file };
}

function validateExecutionState(file, levelName) {
  const { data } = parseFrontmatter(file);
  requireKeys(file, data, ["project", "level", "current_zone", "current_capability", "current_task", "phase", "last_updated_at"]);
  if (projectId && data.project !== projectId) fail(file, `project must equal project_id (${projectId})`);
  if (data.level !== levelName) fail(file, `execution-state.level must equal parent level directory (${levelName})`);
}

function validateCrossRefs(levels, zones, capabilities, tasks) {
  for (const level of levels.values()) {
    for (const dep of level.dependsOn) {
      if (dep !== "[]" && dep !== "" && dep !== null && dep !== undefined && !levels.has(dep) && dep !== "none") {
        fail(level.file, `level.depends_on references missing level: ${dep}`);
      }
    }
    for (const zoneId of level.zones) {
      if (!zones.has(zoneId)) fail(level.file, `level.zones references missing zone: ${zoneId}`);
    }
  }

  for (const zone of zones.values()) {
    for (const dep of zone.dependsOn) {
      if (dep !== "[]" && dep !== "" && dep !== null && dep !== undefined && !zones.has(dep) && dep !== "none") {
        fail(zone.file, `zone.depends_on references missing zone: ${dep}`);
      }
    }
    for (const capabilityId of zone.capabilities) {
      if (capabilityId === "待建立") continue;
      if (!capabilities.has(capabilityId)) warn(zone.file, `zone.capabilities references missing capability: ${capabilityId}`);
    }
  }

  for (const capability of capabilities.values()) {
    for (const dep of capability.dependsOn) {
      if (dep !== "[]" && dep !== "" && dep !== null && dep !== undefined && !capabilities.has(dep) && dep !== "none") {
        fail(capability.file, `capability.depends_on references missing capability: ${dep}`);
      }
    }
    for (const taskId of capability.tasks) {
      if (taskId === "待进入执行期时生成") continue;
      if (!tasks.has(taskId)) warn(capability.file, `capability.tasks references missing task: ${taskId}`);
    }
  }

  for (const task of tasks.values()) {
    for (const dep of task.dependsOn) {
      if (dep !== "[]" && dep !== "" && dep !== null && dep !== undefined && !tasks.has(dep) && dep !== "none") {
        fail(task.file, `task.depends_on references missing task: ${dep}`);
      }
    }
  }
}

for (const item of warnings) {
  console.warn(`WARN ${path.relative(process.cwd(), item.file)}: ${item.message}`);
}
for (const item of errors) {
  console.error(`ERROR ${path.relative(process.cwd(), item.file)}: ${item.message}`);
}

if (errors.length > 0) {
  console.error(`\nLearning spec validation failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`Learning spec validation passed: 0 errors, ${warnings.length} warning(s).`);
