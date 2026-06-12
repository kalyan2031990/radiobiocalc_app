/**
 * Lightweight startup checks — API health, anonymised demo plan, reference TCP/NTCP band.
 */

import { getApiBaseUrl } from "@/constants/oauth";
import { appFetch } from "@/lib/api-fetch";
import { usesLocalEngine } from "@/lib/offline-mode";
import { mobileBootSelfTest } from "@/lib/mobile-boot-selftest";

export type SelfTestCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type SelfTestResult = {
  ok: boolean;
  checks: SelfTestCheck[];
  ranAt: string;
};

const TCP_MIN = 0.75;
const TCP_MAX = 0.98;
const NTCP_MIN = 0.5;
const NTCP_MAX = 0.95;

export async function runAppSelfTest(): Promise<SelfTestResult> {
  const checks: SelfTestCheck[] = [];

  if (usesLocalEngine()) {
    const engine = mobileBootSelfTest();
    checks.push({
      id: "offline_engine",
      label: "On-device DVH parser",
      ok: engine.ok,
      detail: engine.detail,
    });
    const base = getApiBaseUrl();
    if (base) {
      try {
        const health = await appFetch(`${base}/api/health`);
        const healthJson = await health.json().catch(() => ({}));
        checks.push({
          id: "export_server",
          label: "Report export server (optional)",
          ok: health.ok && healthJson?.ok === true,
          detail: health.ok ? base : `HTTP ${health.status}`,
        });
      } catch (e) {
        checks.push({
          id: "export_server",
          label: "Report export server (optional)",
          ok: false,
          detail: e instanceof Error ? e.message : "Unreachable",
        });
      }
    }
    return {
      ok: checks.filter((c) => c.id !== "export_server").every((c) => c.ok),
      checks,
      ranAt: new Date().toISOString(),
    };
  }

  const base = getApiBaseUrl();

  try {
    const health = await appFetch(`${base}/api/health`);
    const healthJson = await health.json().catch(() => ({}));
    checks.push({
      id: "health",
      label: "API server",
      ok: health.ok && healthJson?.ok === true,
      detail: health.ok ? base : `HTTP ${health.status}`,
    });
  } catch (e) {
    checks.push({
      id: "health",
      label: "API server",
      ok: false,
      detail: e instanceof Error ? e.message : "Unreachable",
    });
  }

  try {
    const input = encodeURIComponent(JSON.stringify({ json: null }));
    const res = await appFetch(
      `${base}/api/trpc/radiobiology.getDemoKastooriPlan?input=${input}`,
    );
    const body = await res.json();
    const payload = body?.result?.data?.json ?? body?.result?.data;
    const ok = res.ok && payload?.success === true;
    const tw = payload?.data?.composite?.therapeutic;
    checks.push({
      id: "demo_plan",
      label: "Anonymised demo plan",
      ok,
      detail: ok
        ? `${payload.data.structureNames?.join(" + ") ?? "structures"}`
        : payload?.error ?? `HTTP ${res.status}`,
    });

    if (ok && tw) {
      const tcpOk = tw.tcp >= TCP_MIN && tw.tcp <= TCP_MAX;
      const ntcpOk = tw.ntcpComposite >= NTCP_MIN && tw.ntcpComposite <= NTCP_MAX;
      checks.push({
        id: "tcp_band",
        label: "TCP sanity (demo)",
        ok: tcpOk,
        detail: `${(tw.tcp * 100).toFixed(1)}% (expected ${TCP_MIN * 100}–${TCP_MAX * 100}%)`,
      });
      checks.push({
        id: "ntcp_band",
        label: "NTCP sanity (demo)",
        ok: ntcpOk,
        detail: `${(tw.ntcpComposite * 100).toFixed(1)}% (expected ${NTCP_MIN * 100}–${NTCP_MAX * 100}%)`,
      });
    }
  } catch (e) {
    checks.push({
      id: "demo_plan",
      label: "Anonymised demo plan",
      ok: false,
      detail: e instanceof Error ? e.message : "Request failed",
    });
  }

  return {
    ok: checks.every((c) => c.ok),
    checks,
    ranAt: new Date().toISOString(),
  };
}
