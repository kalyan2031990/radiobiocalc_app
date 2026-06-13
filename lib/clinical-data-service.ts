/**
 * Persist clinical xlsx settings: bundled dataset + optional user upload.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import bundledClinical from "@/assets/clinical/bundled-clinical-hn57.json";
import {
  clinicalBundleSummary,
  clinicalDataSourceLabel,
  emptyClinicalBundle,
  lookupClinicalRecord,
  mergeClinicalBundles,
  type ClinicalBundle,
  type ClinicalRecord,
} from "@/lib/clinical-xlsx-core";

const SETTINGS_KEY = "rbgyanx_clinical_settings_v1";
const UPLOAD_KEY = "rbgyanx_clinical_upload_v1";

export type ClinicalDataSettings = {
  useBundledClinical: boolean;
  applyCovariatesToCalculation: boolean;
  uploadedFileName: string | null;
};

const DEFAULT_SETTINGS: ClinicalDataSettings = {
  useBundledClinical: true,
  applyCovariatesToCalculation: true,
  uploadedFileName: null,
};

function bundledFromAsset(): ClinicalBundle {
  const raw = bundledClinical as ClinicalBundle;
  return {
    treatmentParams: raw.treatmentParams ?? [],
    ptvSynthetic: raw.ptvSynthetic ?? [],
    hnTemplates: raw.hnTemplates ?? [],
    cohortStats: raw.cohortStats ?? {},
  };
}

export async function getClinicalDataSettings(): Promise<ClinicalDataSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveClinicalDataSettings(
  patch: Partial<ClinicalDataSettings>,
): Promise<ClinicalDataSettings> {
  const current = await getClinicalDataSettings();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

async function loadUploadedBundle(): Promise<ClinicalBundle | null> {
  try {
    const json = await AsyncStorage.getItem(UPLOAD_KEY);
    if (!json) return null;
    return JSON.parse(json) as ClinicalBundle;
  } catch {
    return null;
  }
}

export async function saveUploadedClinicalXlsx(
  fileName: string,
  bytes: ArrayBuffer,
): Promise<{ bundle: ClinicalBundle; summary: ReturnType<typeof clinicalBundleSummary> }> {
  const { buildClinicalBundleFromXlsxFiles } = await import("@/lib/clinical-xlsx-parse");
  const bundle = buildClinicalBundleFromXlsxFiles([{ fileName, bytes }]);
  await AsyncStorage.setItem(UPLOAD_KEY, JSON.stringify(bundle));
  await saveClinicalDataSettings({
    uploadedFileName: fileName,
    applyCovariatesToCalculation: true,
  });
  return { bundle, summary: clinicalBundleSummary(bundle) };
}

export async function clearUploadedClinicalXlsx(): Promise<void> {
  await AsyncStorage.removeItem(UPLOAD_KEY);
  await saveClinicalDataSettings({ uploadedFileName: null });
}

export async function getActiveClinicalBundle(): Promise<ClinicalBundle> {
  const settings = await getClinicalDataSettings();
  const uploaded = await loadUploadedBundle();
  let bundle = emptyClinicalBundle();

  if (settings.useBundledClinical) {
    bundle = mergeClinicalBundles(bundle, bundledFromAsset());
  }
  if (uploaded) {
    bundle = mergeClinicalBundles(bundle, uploaded);
  }
  return bundle;
}

export type ClinicalLookupResult = {
  record: ClinicalRecord;
  bundleSummary: ReturnType<typeof clinicalBundleSummary>;
  settings: ClinicalDataSettings;
  hasAnySource: boolean;
};

export async function lookupClinicalForPlan(
  patientId: string,
  organKey: string,
  isTarget: boolean,
): Promise<ClinicalLookupResult> {
  const settings = await getClinicalDataSettings();
  const bundle = await getActiveClinicalBundle();
  const hasAnySource =
    settings.useBundledClinical ||
    (settings.uploadedFileName != null && bundle.treatmentParams.length > 0);
  const record = hasAnySource
    ? lookupClinicalRecord(bundle, patientId, organKey, isTarget)
    : {
        patientId,
        organ: isTarget ? "PTV" : organKey,
        age: 60,
        sex: "U",
        totalDoseGy: 66,
        fractions: 33,
        dosePerFractionGy: 2,
        dataSource: "none" as const,
        syntheticFlag: true,
        adequateForCorrelation: false,
        sourceFile: "",
        note: "No clinical dataset enabled",
      };
  return {
    record,
    bundleSummary: clinicalBundleSummary(bundle),
    settings,
    hasAnySource,
  };
}

export function clinicalDataStatusLabel(record: ClinicalRecord): string {
  return clinicalDataSourceLabel(record);
}
