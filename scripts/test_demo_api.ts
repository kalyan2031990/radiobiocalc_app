async function main() {
  const input = encodeURIComponent(JSON.stringify({ json: null }));
  const url = `http://localhost:3000/api/trpc/radiobiology.getDemoKastooriPlan?input=${input}`;
  const t0 = Date.now();
  const res = await fetch(url);
  const text = await res.text();
  console.log("status", res.status, "ms", Date.now() - t0, "bytes", text.length);
  const parsed = JSON.parse(text);
  const payload = parsed?.result?.data?.json ?? parsed?.result?.data;
  console.log("success", payload?.success);
  if (payload?.success) {
    console.log("session", payload.data.serverDvhSessionId);
    console.log("structures", payload.data.structureNames);
    console.log("hasBundle", "bundle" in (payload.data ?? {}));
  } else {
    console.log("error", payload?.error);
  }
}

main().catch(console.error);
