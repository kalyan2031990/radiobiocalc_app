/**
 * Offline calculation setup — no tRPC (mobile + desktop local engine).
 * Parity with pilot setup: clinical context, therapeutic window eligibility, patient/plan fields.
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect, useMemo, useCallback } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  structureKeys,
  mapToLiteratureOrgan,
  type ParsedDvhBundle,
} from "@/lib/plan-evaluation";
import { loadDvhSession } from "@/lib/dvh-session";
import {
  inferEvaluationRole,
  literatureOrganForRole,
  defaultModelForRole,
} from "@/lib/structure-role";
import { analyzePlanScope } from "@/lib/plan-scope";
import { inferCancerSiteFromStructureNames } from "@/lib/infer-cancer-site";
import { getUserVersionLine, getVersionLine } from "@/lib/app-meta";
import { isClinicianMobileApk } from "@/lib/clinician-build";
import { formatImportedPlanLabel } from "@/lib/user-facing-labels";
import { ClinicalContextForm } from "@/components/clinical-context-form";
import { ClinicalDataPanel } from "@/components/clinical-data-panel";
import { EMPTY_CLINICAL, type ClinicalContext } from "@/lib/clinical-context";
import type { ClinicalRecord } from "@/lib/clinical-xlsx-core";
import { extractPatientIdFromDvh } from "@/lib/clinical-record-map";
import type { ClinicalDataSettings } from "@/lib/clinical-data-service";

type ModelId =
  | "lkb_loglogit"
  | "lkb_probit"
  | "poisson"
  | "zaider_minerbo"
  | "poisson_dvh";

const SITE_OPTIONS = [
  { id: "HN", label: "Head & Neck" },
  { id: "LUNG", label: "Lung" },
  { id: "BREAST", label: "Breast" },
  { id: "PROSTATE", label: "Prostate" },
  { id: "RECTUM", label: "Rectum" },
  { id: "CERVIX", label: "Cervix" },
  { id: "BRAIN", label: "Brain" },
];

const TECHNIQUES = ["3DCRT", "IMRT", "VMAT", "IGRT", "SRT", "SBRT"];

const OAR_ORGANS = [
  "Parotid",
  "Larynx",
  "Spinal Cord",
  "Brainstem",
  "Lung",
  "Heart",
  "Esophagus",
  "Rectum",
  "Bladder",
];

const TARGET_ORGANS = ["PTV", "GTV", "CTV"];

function modelOptionsForRole(role: "target" | "oar"): { id: ModelId; label: string }[] {
  return role === "target"
    ? [
        { id: "lkb_loglogit", label: "LKB log-logistic" },
        { id: "zaider_minerbo", label: "Zaider–Minerbo" },
        { id: "poisson_dvh", label: "Poisson-LQ (DVH)" },
      ]
    : [
        { id: "lkb_loglogit", label: "LKB log-logistic" },
        { id: "lkb_probit", label: "LKB probit" },
        { id: "poisson", label: "Poisson" },
      ];
}

export default function CalculationSetupOfflineScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const dvhSessionId = params.dvhSessionId as string;
  const importedFileName = (params.fileName as string) || "";

  const [dvhBundle, setDvhBundle] = useState<ParsedDvhBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState("");
  const [planLabel, setPlanLabel] = useState("Plan 1");
  const [clinical, setClinical] = useState<ClinicalContext>({ ...EMPTY_CLINICAL });
  const [includeClinicalInReport, setIncludeClinicalInReport] = useState(true);
  const [clinicalRecord, setClinicalRecord] = useState<ClinicalRecord | null>(null);
  const [clinicalSettings, setClinicalSettings] = useState<ClinicalDataSettings | null>(null);
  const [selectedStructure, setSelectedStructure] = useState("");
  const [structureType, setStructureType] = useState<"target" | "oar">("oar");
  const [selectedOrgan, setSelectedOrgan] = useState("Parotid");
  const [selectedModel, setSelectedModel] = useState<ModelId>(
    defaultModelForRole("oar", "HN") as ModelId,
  );
  const [targetType, setTargetType] = useState("PTV");
  const [totalDose, setTotalDose] = useState("70");
  const [numFractions, setNumFractions] = useState("35");
  const [cancerSite, setCancerSite] = useState("HN");
  const [technique, setTechnique] = useState("IMRT");
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [showTechniquePicker, setShowTechniquePicker] = useState(false);
  const [showOrganPicker, setShowOrganPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const fileStructures = useMemo(
    () => (dvhBundle ? structureKeys(dvhBundle) : []),
    [dvhBundle],
  );

  const planMeta = useMemo(() => analyzePlanScope(dvhBundle), [dvhBundle]);

  const resolvedPatientId = useMemo(() => {
    const fromField = patientId.trim();
    if (fromField && fromField !== "—") return fromField;
    return extractPatientIdFromDvh(dvhBundle?.patientInfo?.patientId, importedFileName);
  }, [patientId, dvhBundle, importedFileName]);

  const handleClinicalPrefill = useCallback((ctx: ClinicalContext, record: ClinicalRecord) => {
    setClinicalRecord(record);
    setClinical((prev) => ({ ...prev, ...ctx }));
    if (!record.syntheticFlag && record.totalDoseGy > 0) {
      setTotalDose(String(record.totalDoseGy));
      setNumFractions(String(record.fractions));
    }
    if (record.technique) {
      const t = record.technique.toUpperCase();
      if (t.includes("VMAT")) setTechnique("VMAT");
      else if (t.includes("IMRT")) setTechnique("IMRT");
    }
  }, []);

  const handleClinicalSettingsChange = useCallback((s: ClinicalDataSettings) => {
    setClinicalSettings(s);
  }, []);

  const modelOptions = useMemo(
    () => modelOptionsForRole(structureType),
    [structureType],
  );

  const organOptions = structureType === "target" ? TARGET_ORGANS : OAR_ORGANS;

  useEffect(() => {
    let cancelled = false;
    if (!dvhSessionId) {
      setLoadError("No DVH session — import a plan file first");
      setLoading(false);
      return;
    }
    loadDvhSession(dvhSessionId)
      .then((bundle) => {
        if (cancelled) return;
        if (!bundle) {
          setLoadError("Could not load DVH data. Re-import the file.");
          setDvhBundle(null);
        } else {
          setDvhBundle(bundle);
          setLoadError(null);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Load failed");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dvhSessionId]);

  useEffect(() => {
    if (!dvhBundle || fileStructures.length === 0) return;
    const first = fileStructures[0];
    setSelectedStructure(first);
    const meta = dvhBundle.structures?.find((s) => s.name === first);
    const role = inferEvaluationRole(first, importedFileName, meta?.type);
    setStructureType(role);
    setSelectedModel(defaultModelForRole(role, cancerSite) as ModelId);
    const lit =
      literatureOrganForRole(first, importedFileName) ??
      mapToLiteratureOrgan(first, importedFileName);
    if (lit) setSelectedOrgan(lit);
    const inferred = inferCancerSiteFromStructureNames(fileStructures, importedFileName);
    if (inferred.siteId !== "UNKNOWN") setCancerSite(inferred.siteId);
  }, [dvhBundle, fileStructures, importedFileName]);

  const selectStructure = (name: string) => {
    setSelectedStructure(name);
    const meta = dvhBundle?.structures?.find((s) => s.name === name);
    const role = inferEvaluationRole(name, importedFileName, meta?.type);
    setStructureType(role);
    setSelectedModel(defaultModelForRole(role, cancerSite) as ModelId);
    const lit =
      literatureOrganForRole(name, importedFileName) ??
      mapToLiteratureOrgan(name, importedFileName);
    if (lit) setSelectedOrgan(lit);
  };

  const handleCalculate = () => {
    const dose = parseFloat(totalDose);
    const fractions = parseInt(numFractions, 10);
    if (Number.isNaN(dose) || dose <= 0) {
      Alert.alert("Error", "Enter a valid total dose (Gy)");
      return;
    }
    if (Number.isNaN(fractions) || fractions <= 0) {
      Alert.alert("Error", "Enter a valid number of fractions");
      return;
    }
    if (!dvhBundle) {
      Alert.alert("Error", loadError ?? "No DVH data");
      return;
    }
    const structureKey = selectedStructure || fileStructures[0] || selectedOrgan;
    router.push({
      pathname: "/calculation-results",
      params: {
        dvhSessionId,
        fileName: importedFileName,
        planScope: planMeta.scope,
        therapeuticWindowEligible: planMeta.therapeuticWindowEligible ? "1" : "0",
        totalDose: String(dose),
        numFractions: String(fractions),
        organ: selectedOrgan,
        structureName: structureKey,
        structureType,
        model: selectedModel,
        cancerSite,
        technique,
        targetType: structureType === "target" ? targetType : "",
        patientId: patientId.trim() || "—",
        planLabel: planLabel.trim() || "Plan",
        geudExponent: "1",
        clinicalJSON: JSON.stringify(clinical),
        includeClinicalInReport: includeClinicalInReport ? "1" : "0",
        applyClinicalCovariates: clinicalSettings?.applyCovariatesToCalculation ? "1" : "0",
        clinicalRecordJSON: clinicalRecord ? JSON.stringify(clinicalRecord) : "",
      },
    });
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.foreground,
    backgroundColor: colors.surface,
  };

  const pickerBox = {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  };

  if (loading) {
    return (
      <ScreenContainer className="bg-background">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.muted }}>Loading DVH…</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Back</Text>
        </Pressable>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {isClinicianMobileApk() ? getUserVersionLine() : getVersionLine()}
        </Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
          Plan evaluation setup
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          One patient · one plan · physical + biological metrics
        </Text>

        {loadError ? (
          <Text style={{ color: colors.error }}>{loadError}</Text>
        ) : (
          <Text style={{ color: colors.muted }}>
            {fileStructures.length} structure(s) loaded
            {importedFileName ? ` · ${formatImportedPlanLabel(importedFileName)}` : ""}
          </Text>
        )}

        <View
          style={{
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: planMeta.therapeuticWindowEligible ? "#6EE7B7" : "#FCD34D",
            backgroundColor: planMeta.therapeuticWindowEligible ? "#D1FAE5" : "#FEF3C7",
          }}
        >
          <Text
            style={{
              fontWeight: "600",
              fontSize: 13,
              color: planMeta.therapeuticWindowEligible ? "#065F46" : "#92400E",
            }}
          >
            {planMeta.therapeuticWindowEligible
              ? "Therapeutic window available — target + OAR detected in this DVH set."
              : "Therapeutic window needs target + OAR — import both PTV and OAR .txt files (multi-select)."}
          </Text>
          {!planMeta.therapeuticWindowEligible && !isClinicianMobileApk() && (
            <Text style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>
              Example: KASTOORI_PTV70.txt + KASTOORI_COM_PRTD.txt together.
            </Text>
          )}
          {!planMeta.therapeuticWindowEligible && isClinicianMobileApk() && (
            <Text style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>
              Import both PTV and OAR .txt files together from Downloads.
            </Text>
          )}
        </View>

        <Text style={{ fontWeight: "600", color: colors.foreground, fontSize: 16 }}>
          Patient & plan
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Patient ID</Text>
        <TextInput
          value={patientId}
          onChangeText={setPatientId}
          placeholder="e.g. HN-001"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
        <Text style={{ color: colors.muted, fontSize: 12 }}>Plan label</Text>
        <TextInput
          value={planLabel}
          onChangeText={setPlanLabel}
          placeholder="e.g. IMRT_v2"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />

        <Text style={{ fontWeight: "600", color: colors.foreground, fontSize: 16 }}>
          Cancer site
        </Text>
        <Pressable onPress={() => setShowSitePicker((v) => !v)}>
          <View style={pickerBox}>
            <Text style={{ color: colors.foreground }}>
              {SITE_OPTIONS.find((s) => s.id === cancerSite)?.label ?? cancerSite}
            </Text>
            <MaterialIcons name="expand-more" size={22} color={colors.muted} />
          </View>
        </Pressable>
        {showSitePicker &&
          SITE_OPTIONS.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                setCancerSite(s.id);
                setShowSitePicker(false);
              }}
              style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 6 }}
            >
              <Text style={{ color: colors.foreground }}>{s.label}</Text>
            </Pressable>
          ))}

        <Text style={{ fontWeight: "600", color: colors.foreground, fontSize: 16 }}>
          Technique
        </Text>
        <Pressable onPress={() => setShowTechniquePicker((v) => !v)}>
          <View style={pickerBox}>
            <Text style={{ color: colors.foreground }}>{technique}</Text>
            <MaterialIcons name="expand-more" size={22} color={colors.muted} />
          </View>
        </Pressable>
        {showTechniquePicker &&
          TECHNIQUES.map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setTechnique(t);
                setShowTechniquePicker(false);
              }}
              style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 6 }}
            >
              <Text style={{ color: colors.foreground }}>{t}</Text>
            </Pressable>
          ))}

        <Text style={{ fontWeight: "600", color: colors.foreground, fontSize: 16 }}>
          DVH structure
        </Text>
        {fileStructures.map((name) => (
          <Pressable
            key={name}
            onPress={() => selectStructure(name)}
            style={{
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: selectedStructure === name ? colors.primary : colors.border,
              backgroundColor: selectedStructure === name ? colors.primary + "18" : colors.surface,
            }}
          >
            <Text style={{ color: colors.foreground }}>{name}</Text>
          </Pressable>
        ))}

        <Text style={{ fontWeight: "600", color: colors.foreground }}>Evaluation mode</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              ["target", "TCP (target)"],
              ["oar", "NTCP (OAR)"],
            ] as const
          ).map(([role, label]) => (
            <Pressable
              key={role}
              onPress={() => {
                setStructureType(role);
                setSelectedModel(defaultModelForRole(role, cancerSite) as ModelId);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: structureType === role ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ color: structureType === role ? "#fff" : colors.foreground, fontSize: 12 }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ fontWeight: "600", color: colors.foreground }}>Literature organ</Text>
        <Pressable onPress={() => setShowOrganPicker((v) => !v)}>
          <View style={pickerBox}>
            <Text style={{ color: colors.foreground }}>{selectedOrgan}</Text>
            <MaterialIcons name="expand-more" size={22} color={colors.muted} />
          </View>
        </Pressable>
        {showOrganPicker &&
          organOptions.map((o) => (
            <Pressable
              key={o}
              onPress={() => {
                setSelectedOrgan(o);
                setShowOrganPicker(false);
              }}
              style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 6 }}
            >
              <Text style={{ color: colors.foreground }}>{o}</Text>
            </Pressable>
          ))}

        {structureType === "target" && (
          <>
            <Text style={{ fontWeight: "600", color: colors.foreground }}>Target type (TCP)</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["GTV", "CTV", "PTV"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTargetType(t)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: targetType === t ? colors.primary : colors.surface,
                  }}
                >
                  <Text style={{ color: targetType === t ? "#fff" : colors.foreground }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={{ fontWeight: "600", color: colors.foreground }}>Model</Text>
        <Pressable onPress={() => setShowModelPicker((v) => !v)}>
          <View style={pickerBox}>
            <Text style={{ color: colors.foreground }}>
              {modelOptions.find((m) => m.id === selectedModel)?.label ?? selectedModel}
            </Text>
            <MaterialIcons name="expand-more" size={22} color={colors.muted} />
          </View>
        </Pressable>
        {showModelPicker &&
          modelOptions.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => {
                setSelectedModel(m.id);
                setShowModelPicker(false);
              }}
              style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 6 }}
            >
              <Text style={{ color: colors.foreground }}>{m.label}</Text>
            </Pressable>
          ))}

        <Text style={{ fontWeight: "600", color: colors.foreground }}>Total dose (Gy)</Text>
        <TextInput
          value={totalDose}
          onChangeText={setTotalDose}
          keyboardType="decimal-pad"
          style={inputStyle}
        />

        <Text style={{ fontWeight: "600", color: colors.foreground }}>Fractions</Text>
        <TextInput
          value={numFractions}
          onChangeText={setNumFractions}
          keyboardType="number-pad"
          style={inputStyle}
        />

        {!isClinicianMobileApk() && (
          <ClinicalDataPanel
            colors={colors}
            patientId={resolvedPatientId}
            organKey={selectedOrgan}
            isTarget={structureType === "target"}
            onClinicalPrefill={handleClinicalPrefill}
            onSettingsChange={handleClinicalSettingsChange}
          />
        )}

        <ClinicalContextForm
          value={clinical}
          onChange={setClinical}
          cancerSite={cancerSite}
          structureType={structureType}
          organ={selectedOrgan}
          colors={colors}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
              Include clinical context in PDF/DOCX
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
              Site-specific presets (HPV, chemo, smoking, age, BMI, etc.) — documented in report;
              optionally adjusts TCP/NTCP when covariate toggle is ON above.
            </Text>
          </View>
          <Switch
            value={includeClinicalInReport}
            onValueChange={setIncludeClinicalInReport}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <Pressable
          onPress={handleCalculate}
          disabled={!dvhBundle}
          style={{
            backgroundColor: dvhBundle ? colors.primary : colors.muted,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            marginTop: 8,
            opacity: dvhBundle ? 1 : 0.5,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Run calculation</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
