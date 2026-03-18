import fs from "fs";
import path from "path";

const cache = new Map();

function loadMap(name) {
  if (cache.has(name)) return cache.get(name);

  const filePath = path.resolve(process.cwd(), `packages/config/mappings/${name}.mapping.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  cache.set(name, data);
  return data;
}

export function getMappedLine(exporter, itemKey) {
  const map = loadMap(exporter);
  return map[itemKey] || {
    code: "",
    description: itemKey,
    unit: "ea",
  };
}
