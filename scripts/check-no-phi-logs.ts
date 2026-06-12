/**
 * CI check: no raw PHI logging patterns in app/lib.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "lib", "components"];
const FORBIDDEN = [
  /console\.(log|info|debug|warn)\([^)]*patientName/i,
  /console\.(log|info|debug|warn)\([^)]*Patient\s*Name/i,
];

let failed = false;
for (const dir of SCAN_DIRS) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const file of walk(full)) {
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const pat of FORBIDDEN) {
      if (pat.test(text)) {
        console.error(`PHI log pattern in ${path.relative(ROOT, file)}`);
        failed = true;
      }
    }
  }
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (failed) process.exit(1);
console.log("PASS: no PHI console.log patterns");
