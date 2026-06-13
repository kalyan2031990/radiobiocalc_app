/**
 * Clinical data source panel — bundled offline dataset + optional xlsx upload.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { MaterialIcons } from "@expo/vector-icons";
import {
  clearUploadedClinicalXlsx,
  getClinicalDataSettings,
  lookupClinicalForPlan,
  saveClinicalDataSettings,
  saveUploadedClinicalXlsx,
  clinicalDataStatusLabel,
  type ClinicalDataSettings,
  type ClinicalLookupResult,
} from "@/lib/clinical-data-service";
import { readDocumentBytes } from "@/lib/read-document-bytes";
import { clinicalRecordToContext } from "@/lib/clinical-record-map";
import type { ClinicalContext } from "@/lib/clinical-context";
import type { ClinicalRecord } from "@/lib/clinical-xlsx-core";

type Colors = {
  foreground: string;
  muted: string;
  surface: string;
  border: string;
  primary: string;
  error?: string;
};

type Props = {
  colors: Colors;
  patientId: string;
  organKey: string;
  isTarget: boolean;
  onClinicalPrefill: (ctx: ClinicalContext, record: ClinicalRecord) => void;
  onSettingsChange?: (settings: ClinicalDataSettings) => void;
};

export function ClinicalDataPanel({
  colors,
  patientId,
  organKey,
  isTarget,
  onClinicalPrefill,
  onSettingsChange,
}: Props) {
  const [settings, setSettings] = useState<ClinicalDataSettings | null>(null);
  const [lookup, setLookup] = useState<ClinicalLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const prefillRef = useRef(onClinicalPrefill);
  prefillRef.current = onClinicalPrefill;
  const settingsChangeRef = useRef(onSettingsChange);
  settingsChangeRef.current = onSettingsChange;

  const loadSettings = useCallback(async () => {
    const s = await getClinicalDataSettings();
    setSettings(s);
    settingsChangeRef.current?.(s);
    return s;
  }, []);

  const reloadLookup = useCallback(async () => {
    if (!patientId) {
      setLookup(null);
      return;
    }
    const lk = await lookupClinicalForPlan(patientId, organKey, isTarget);
    setLookup(lk);
    if (lk.hasAnySource) {
      prefillRef.current(clinicalRecordToContext(lk.record), lk.record);
      const s = await getClinicalDataSettings();
      if (!s.applyCovariatesToCalculation) {
        const next = await saveClinicalDataSettings({ applyCovariatesToCalculation: true });
        setSettings(next);
        settingsChangeRef.current?.(next);
      }
    }
  }, [patientId, organKey, isTarget]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await loadSettings();
        if (!cancelled) await reloadLookup();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSettings, reloadLookup]);

  const patchSettings = async (patch: Partial<ClinicalDataSettings>) => {
    const next = await saveClinicalDataSettings(patch);
    setSettings(next);
    settingsChangeRef.current?.(next);
    setLoading(true);
    try {
      await reloadLookup();
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });
      if (pick.canceled || !pick.assets?.[0]) return;
      const asset = pick.assets[0];
      setUploading(true);
      const bytes = await readDocumentBytes(asset);
      const { summary } = await saveUploadedClinicalXlsx(asset.name, bytes);
      Alert.alert(
        "Clinical xlsx loaded",
        `${asset.name}\n${summary.treatmentRows} treatment rows · ${summary.patientCount} patients`,
      );
      const s = await loadSettings();
      setSettings(s);
      await reloadLookup();
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleClearUpload = async () => {
    await clearUploadedClinicalXlsx();
    const s = await loadSettings();
    setSettings(s);
    await reloadLookup();
  };

  const record = lookup?.record;
  const synthetic = record?.syntheticFlag === true;

  return (
    <View
      style={{
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MaterialIcons name="medical-information" size={20} color={colors.primary} />
        <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 15 }}>
          Clinical data (xlsx)
        </Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        Bundled HN57 dataset ships with offline APK. Upload your own xlsx to override. Synthetic
        rows are flagged when patient/organ is not matched.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                Use bundled clinical file
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                bundled-clinical-hn57.json (115 rows, 57 patients)
              </Text>
            </View>
            <Switch
              value={settings?.useBundledClinical ?? true}
              onValueChange={(v) => void patchSettings({ useBundledClinical: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => void handleUpload()}
              disabled={uploading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: colors.primary,
                alignItems: "center",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {uploading ? "Reading…" : "Upload xlsx"}
              </Text>
            </Pressable>
            {settings?.uploadedFileName ? (
              <Pressable
                onPress={() => void handleClearUpload()}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.muted }}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          {settings?.uploadedFileName ? (
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Uploaded: {settings.uploadedFileName}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                Apply covariates to TCP/NTCP
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                Log-odds adjustment (age, sex, chemo, smoking, ECOG). ON when clinical data is linked.
              </Text>
            </View>
            <Switch
              value={settings?.applyCovariatesToCalculation ?? false}
              onValueChange={(v) => void patchSettings({ applyCovariatesToCalculation: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {patientId && record ? (
            <View
              style={{
                borderRadius: 8,
                padding: 10,
                backgroundColor: synthetic ? "#FEF3C7" : "#D1FAE5",
                borderWidth: 1,
                borderColor: synthetic ? "#FCD34D" : "#6EE7B7",
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 12,
                  color: synthetic ? "#92400E" : "#065F46",
                }}
              >
                {synthetic ? "Synthetic / imputed clinical row" : "Observed clinical match"}
              </Text>
              <Text style={{ fontSize: 11, color: synthetic ? "#92400E" : "#065F46", marginTop: 4 }}>
                Patient {patientId} · {record.organ} · age {record.age} · {record.sex}
                {record.toxicity != null ? ` · toxicity ${record.toxicity}` : ""}
              </Text>
              <Text style={{ fontSize: 11, color: synthetic ? "#92400E" : "#065F46", marginTop: 2 }}>
                {clinicalDataStatusLabel(record)}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

export function ClinicalDataPanelCompact({
  applyCovariates,
  syntheticFlag,
  dataSource,
}: {
  applyCovariates: boolean;
  syntheticFlag: boolean;
  dataSource: string;
}) {
  return (
    <Text style={{ fontSize: 11, color: "#64748B" }}>
      Clinical: {dataSource}
      {syntheticFlag ? " · synthetic-flagged" : " · observed"}
      {applyCovariates ? " · covariates ON" : " · covariates OFF"}
    </Text>
  );
}
