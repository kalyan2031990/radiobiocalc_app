import { offlineEngineSelfTest } from "../lib/offline-engine";

const r = offlineEngineSelfTest();
if (!r.ok) {
  console.error("FAIL:", r.detail);
  process.exit(1);
}
console.log("PASS offline engine:", r.detail);
