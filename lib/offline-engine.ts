/**
 * On-device radiobiology engine (same logic as server/radiobiology + composite evaluation).
 */

import {
  parseCSVDVH,
  mergeDvhData,
  type DVHData,
} from "@/server/data-handler";
import {
  performCalculation,
  type CalculationRequest,
  type CalculationResult,
  type OrganParameters,
} from "@/server/radiobiology";
import { getOrganParameters } from "@/server/parameters";
import { evaluateCompositePlan } from "@/server/composite-plan-evaluation";
import type { CompositePlanEvaluation } from "@/lib/composite-plan-types";
import type { ParsedDvhBundle } from "@/lib/plan-evaluation";

export function dvhDataToBundle(data: DVHData): ParsedDvhBundle {
  return {
    patientInfo: {
      patientId: data.patientInfo.patientId,
      patientName: data.patientInfo.patientName,
      modality: data.patientInfo.modality,
    },
    structures: data.structures.map((s) => ({
      name: s.name,
      type: s.type,
    })),
    dvhByStructure: data.dvhByStructure,
    doseUnit: data.doseUnit,
    volumeUnit: data.volumeUnit,
  };
}

export function bundleToDvhData(bundle: ParsedDvhBundle): DVHData {
  return {
    patientInfo: {
      patientId: bundle.patientInfo?.patientId ?? "LOCAL-001",
      patientName: bundle.patientInfo?.patientName ?? "Offline patient",
      modality: bundle.patientInfo?.modality ?? "RT",
    },
    structures: bundle.structures.map((s) => ({
      name: s.name,
      type: (s.type === "target" ? "target" : "oar") as "target" | "oar",
    })),
    dvhByStructure: bundle.dvhByStructure,
    isDifferential: false,
    doseUnit: "Gy",
    volumeUnit: "relative",
  };
}

export function offlineParseDvh(content: string, fileName: string): ParsedDvhBundle {
  return dvhDataToBundle(parseCSVDVH(content, fileName));
}

export function offlineMergeDvhs(bundles: ParsedDvhBundle[]): ParsedDvhBundle {
  if (bundles.length === 0) {
    throw new Error("No DVH data to merge");
  }
  const merged = mergeDvhData(bundles.map(bundleToDvhData));
  return dvhDataToBundle(merged);
}

export function offlineCalculate(
  request: CalculationRequest,
): CalculationResult {
  const params = getOrganParameters(request.organ, request.model);
  if (!params) {
    throw new Error(`No literature parameters for ${request.organ} / ${request.model}`);
  }
  return performCalculation(request, params);
}

export function offlineEvaluateComposite(
  bundle: ParsedDvhBundle,
  options: {
    totalDose: number;
    numFractions: number;
    cancerSite?: string;
    technique?: string;
    prescriptionGy?: number;
    fileHint?: string;
  },
): CompositePlanEvaluation {
  return evaluateCompositePlan(bundleToDvhData(bundle), {
    totalDose: options.totalDose,
    numFractions: options.numFractions,
    cancerSite: options.cancerSite ?? "HN",
    technique: options.technique ?? "IMRT",
    prescriptionGy: options.prescriptionGy ?? options.totalDose,
    fileHint: options.fileHint ?? bundle.patientInfo?.patientName ?? "",
  });
}

/** Smoke test for offline engine (no network). */
export function offlineEngineSelfTest(): { ok: boolean; detail: string } {
  try {
    const csv = `dose,volume,structure
0,100,PTV70
70,95,PTV70
0,50,Parotid_L
50,20,Parotid_L`;
    const bundle = offlineParseDvh(csv, "selftest.csv");
    const ev = offlineEvaluateComposite(bundle, {
      totalDose: 70,
      numFractions: 35,
      cancerSite: "HN",
    });
    if (ev.therapeutic.tcp <= 0 || ev.therapeutic.tcp > 1) {
      return { ok: false, detail: "TCP out of range" };
    }
    return {
      ok: true,
      detail: `TCP ${(ev.therapeutic.tcp * 100).toFixed(0)}% · UTCP ${(ev.therapeutic.utcp * 100).toFixed(0)}%`,
    };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "Engine error",
    };
  }
}

export type { CalculationRequest, CalculationResult, OrganParameters };
