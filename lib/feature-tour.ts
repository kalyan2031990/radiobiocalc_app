/**
 * Feature tour runner — lives outside screen lifecycle to avoid unmount errors on replay.
 */

import type { Router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { markFirstLaunchDone } from "@/lib/onboarding";
import { DEMO_PATIENT_ID } from "@/lib/demo-constants";
import { savePlanEvalSession } from "@/lib/plan-eval-session";
import {
  inferEvaluationRole,
  literatureOrganForRole,
  defaultModelForRole,
} from "@/lib/structure-role";
import { EMPTY_CLINICAL } from "@/lib/clinical-context";
import type { CompositePlanEvaluation } from "@/lib/composite-plan-types";
import { getApiBaseUrl } from "@/constants/oauth";
import { appFetch } from "@/lib/api-fetch";
import { isOfflineBuild } from "@/lib/offline-mode";
import { offlineEvaluateComposite, offlineParseDvh } from "@/lib/offline-engine";

const DISCLAIMER_KEY = "@rbgyanx_disclaimer_accepted";
const DEMO_DVH_CLIENT_ID = "demo_server";
const TOTAL_DOSE = 70;
const NUM_FRACTIONS = 35;

export type TourStepId =
  | "disclaimer"
  | "load"
  | "setup"
  | "ntcp"
  | "tcp"
  | "dose-response"
  | "therapeutic"
  | "home";

export type TourProgress = {
  step: TourStepId;
  status: "active" | "done" | "error";
  summary?: string;
  error?: string;
};

let tourRunning = false;
let tourCancelled = false;

export function cancelFeatureTour(): void {
  tourCancelled = true;
}

export function isFeatureTourRunning(): boolean {
  return tourRunning;
}

async function wait(ms: number): Promise<void> {
  if (tourCancelled) return;
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchDemoPlan(): Promise<{
  serverDvhSessionId: string;
  fileName: string;
  primaryTarget: string | null;
  oarStructure: string | null;
  structureNames: string[];
  composite: CompositePlanEvaluation;
  planScope: string;
  therapeuticWindowEligible: boolean;
}> {
  if (isOfflineBuild()) {
    const csv = `dose,volume,structure
0,100,PTV70
35,100,PTV70
70,95,PTV70
0,50,Parotid_L
30,45,Parotid_L
70,5,Parotid_L`;
    const bundle = offlineParseDvh(csv, "HN-DEMO-001.csv");
    const composite = offlineEvaluateComposite(bundle, {
      totalDose: 70,
      numFractions: 35,
      cancerSite: "HN",
      fileHint: "HN-DEMO-001",
    });
    const names = Object.keys(bundle.dvhByStructure);
    return {
      serverDvhSessionId: "",
      fileName: "HN-DEMO-001",
      primaryTarget: "PTV70",
      oarStructure: "Parotid_L",
      structureNames: names,
      composite,
      planScope: "multi_structure",
      therapeuticWindowEligible: true,
    };
  }

  const input = encodeURIComponent(JSON.stringify({ json: null }));
  const res = await appFetch(
    `${getApiBaseUrl()}/api/trpc/radiobiology.getDemoKastooriPlan?input=${input}`,
  );
  const body = await res.json();
  const payload = body?.result?.data?.json ?? body?.result?.data;
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Demo plan HTTP ${res.status}`);
  }
  return payload.data;
}

function buildResultsParams(ctx: {
  dvhSessionId: string;
  serverDvhSessionId: string;
  fileName: string;
  structureName: string;
  structureType: "target" | "oar";
  organ: string;
  model: string;
  planScope: string;
  therapeuticWindowEligible: boolean;
}) {
  return {
    dvhSessionId: ctx.dvhSessionId,
    serverDvhSessionId: ctx.serverDvhSessionId,
    fileName: ctx.fileName,
    planScope: ctx.planScope,
    therapeuticWindowEligible: ctx.therapeuticWindowEligible ? "1" : "0",
    totalDose: String(TOTAL_DOSE),
    numFractions: String(NUM_FRACTIONS),
    organ: ctx.organ,
    structureName: ctx.structureName,
    structureType: ctx.structureType,
    model: ctx.model,
    cancerSite: "HN",
    technique: "IMRT",
    targetType: ctx.structureType === "target" ? "PTV" : "",
    patientId: DEMO_PATIENT_ID,
    planLabel: "Demo composite",
    geudExponent: "1",
    parametersJSON: "",
    useCustomParams: "0",
    clinicalJSON: JSON.stringify(EMPTY_CLINICAL),
  };
}

export async function runFeatureTour(
  router: Router,
  onProgress?: (p: TourProgress) => void,
): Promise<{ ok: boolean; error?: string; summary?: string }> {
  if (tourRunning) {
    return { ok: false, error: "Tour already running" };
  }
  tourRunning = true;
  tourCancelled = false;

  const progress = (step: TourStepId, status: "active" | "done" | "error", extra?: Partial<TourProgress>) => {
    onProgress?.({ step, status, ...extra });
  };

  try {
    progress("disclaimer", "active");
    await AsyncStorage.setItem(DISCLAIMER_KEY, "true");
    progress("disclaimer", "done");

    progress("load", "active");
    const data = await fetchDemoPlan();
    if (tourCancelled) return { ok: false, error: "Cancelled" };

    const composite = data.composite as CompositePlanEvaluation;
    const structureResults = Array.isArray(composite.structureResults)
      ? composite.structureResults
      : [];
    const planEvalSessionId = await savePlanEvalSession(composite);
    const tw = composite.therapeutic;
    const summary = `TCP ${(tw.tcp * 100).toFixed(1)}% · NTCP ${(tw.ntcpComposite * 100).toFixed(1)}% · UTCP ${(tw.utcp * 100).toFixed(1)}% · TWI ${(tw.twi * 100).toFixed(1)}% (${tw.twiInterpretation})`;
    progress("load", "done", { summary });

    const oarName =
      data.oarStructure ??
      data.structureNames.find((n) => /parot|prtd|combo/i.test(n)) ??
      "COMB_PRTD";
    const tgtName =
      data.primaryTarget ??
      data.structureNames.find((n) => /ptv|gtv|ctv/i.test(n)) ??
      data.structureNames[0] ??
      "PTV70new";

    const baseCtx = {
      dvhSessionId: DEMO_DVH_CLIENT_ID,
      serverDvhSessionId: data.serverDvhSessionId,
      fileName: data.fileName,
      planScope: data.planScope,
      therapeuticWindowEligible: data.therapeuticWindowEligible,
    };

    progress("setup", "active");
    router.push({
      pathname: "/calculation-setup",
      params: {
        dvhSessionId: DEMO_DVH_CLIENT_ID,
        serverDvhSessionId: data.serverDvhSessionId,
        fileName: data.fileName,
      },
    });
    await wait(4500);
    if (tourCancelled) return { ok: false, error: "Cancelled" };
    progress("setup", "done");

    const oarRole = inferEvaluationRole(oarName, data.fileName);
    const tgtRole = inferEvaluationRole(tgtName, data.fileName);

    progress("ntcp", "active");
    router.push({
      pathname: "/calculation-results",
      params: buildResultsParams({
        ...baseCtx,
        structureName: oarName,
        structureType: oarRole,
        organ: literatureOrganForRole(oarName, data.fileName) ?? "Parotid",
        model: defaultModelForRole(oarRole),
      }),
    });
    await wait(7000);
    if (tourCancelled) return { ok: false, error: "Cancelled" };
    progress("ntcp", "done");

    progress("tcp", "active");
    router.push({
      pathname: "/calculation-results",
      params: buildResultsParams({
        ...baseCtx,
        structureName: tgtName,
        structureType: tgtRole,
        organ: literatureOrganForRole(tgtName, data.fileName) ?? "PTV",
        model: defaultModelForRole(tgtRole),
      }),
    });
    await wait(7000);
    if (tourCancelled) return { ok: false, error: "Cancelled" };
    progress("tcp", "done");

    const oarSr = structureResults.find((s) => s.structureName === oarName);
    progress("dose-response", "active");
    router.push({
      pathname: "/dose-response",
      params: {
        structureType: "oar",
        organ: literatureOrganForRole(oarName, data.fileName) ?? "Parotid",
        model: defaultModelForRole("oar"),
        totalDose: String(TOTAL_DOSE),
        probability: String(oarSr?.ntcp ?? tw.ntcpComposite ?? 0),
        td50: "28",
        gamma50: "1",
        geud: String(oarSr?.doseMetrics?.gEUD ?? TOTAL_DOSE),
      },
    });
    await wait(4500);
    if (tourCancelled) return { ok: false, error: "Cancelled" };
    progress("dose-response", "done");

    progress("therapeutic", "active");
    router.push({
      pathname: "/therapeutic-window",
      params: {
        planEvalSessionId,
        totalDose: String(TOTAL_DOSE),
        tcp: String(tw.tcp),
        ntcp: String(tw.ntcpComposite),
      },
    });
    await wait(5500);
    if (tourCancelled) return { ok: false, error: "Cancelled" };
    progress("therapeutic", "done");

    progress("home", "active");
    // Skip mock-only DVH viz screen — real DVH view opens from results with session params
    router.replace("/(tabs)");
    progress("home", "done");
    await markFirstLaunchDone();

    return { ok: true, summary };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Tour failed";
    onProgress?.({ step: "load", status: "error", error: msg });
    return { ok: false, error: msg };
  } finally {
    tourRunning = false;
  }
}
