/**
 * Calculation Setup Screen
 * 
 * Allows users to:
 * - Select fractionation scheme (total dose, # fractions)
 * - Select calculation model (LKB, Poisson, etc.)
 * - Select organ and structure type
 * - Review and adjust parameters
 * - Proceed to calculation
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  structureKeys,
  inferStructureType,
  mapToLiteratureOrgan,
  type ParsedDvhBundle,
} from "@/lib/plan-evaluation";
import { ClinicalContextForm } from "@/components/clinical-context-form";
import { EMPTY_CLINICAL, type ClinicalContext } from "@/lib/clinical-context";
import { loadDvhSession } from "@/lib/dvh-session";
import {
  inferEvaluationRole,
  literatureOrganForRole,
  defaultModelForRole,
} from "@/lib/structure-role";
import { analyzePlanScope } from "@/lib/plan-scope";
import { inferCancerSiteFromStructureNames } from "@/lib/infer-cancer-site";

interface Organ {
  name: string;
  category: string;
}

interface Parameter {
  td50: number;
  gamma50: number;
  m: number;
  n: number;
  alphaBeta: number;
  d50: number;
  gamma: number;
  s: number;
}

type ModelId =
  | "lkb_loglogit"
  | "lkb_probit"
  | "poisson"
  | "zaider_minerbo"
  | "poisson_dvh";

export default function CalculationSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();
  const dvhSessionId = params.dvhSessionId as string;
  const serverDvhSessionId = params.serverDvhSessionId as string | undefined;
  const importedFileName = (params.fileName as string) || "";

  const [clientBundle, setClientBundle] = useState<ParsedDvhBundle | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);
  const [dvhLoadError, setDvhLoadError] = useState<string | null>(null);

  const serverDvhQuery = trpc.radiobiology.getDvhSession.useQuery(
    { sessionId: serverDvhSessionId! },
    { enabled: clientLoaded && !clientBundle && !!serverDvhSessionId },
  );

  const dvhBundle =
    clientBundle ??
    (serverDvhQuery.data?.success
      ? (serverDvhQuery.data.data as ParsedDvhBundle)
      : null);

  const fileStructures = useMemo(
    () => (dvhBundle ? structureKeys(dvhBundle) : []),
    [dvhBundle],
  );

  useEffect(() => {
    let cancelled = false;
    if (!dvhSessionId) {
      setDvhLoadError("No DVH session — import a plan file first");
      setClientLoaded(true);
      return;
    }
    loadDvhSession(dvhSessionId).then((bundle) => {
      if (cancelled) return;
      setClientBundle(bundle);
      setClientLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [dvhSessionId]);

  useEffect(() => {
    if (!clientLoaded) return;
    if (clientBundle) {
      setDvhLoadError(null);
      return;
    }
    if (serverDvhSessionId && serverDvhQuery.isLoading) return;
    if (serverDvhQuery.data?.success) {
      setDvhLoadError(null);
      return;
    }
    if (!dvhSessionId) return;
    if (clientLoaded && !clientBundle && !serverDvhQuery.isLoading) {
      setDvhLoadError("Could not load DVH data. Re-import the file.");
    }
  }, [
    clientLoaded,
    clientBundle,
    dvhSessionId,
    serverDvhSessionId,
    serverDvhQuery.isLoading,
    serverDvhQuery.data,
  ]);

  // State
  const [patientId, setPatientId] = useState("");
  const [planLabel, setPlanLabel] = useState("Plan 1");
  const [clinical, setClinical] = useState<ClinicalContext>({ ...EMPTY_CLINICAL });
  const [selectedStructure, setSelectedStructure] = useState("");
  const [structureType, setStructureType] = useState<"target" | "oar">("oar");
  const [totalDose, setTotalDose] = useState("70");
  const [numFractions, setNumFractions] = useState("35");
  const [cancerSite, setCancerSite] = useState("UNKNOWN");
  const [technique, setTechnique] = useState("IMRT");
  const [targetType, setTargetType] = useState("PTV");
  const [selectedModel, setSelectedModel] = useState<ModelId>("lkb_loglogit");
  const [selectedOrgan, setSelectedOrgan] = useState("Parotid");
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [parameters, setParameters] = useState<Parameter | null>(null);
  const [useCustomParams, setUseCustomParams] = useState(false);
  const [geudExponent, setGeudExponent] = useState("1");
  const [loading, setLoading] = useState(true);
  const [showOrganPicker, setShowOrganPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showStructurePicker, setShowStructurePicker] = useState(false);
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [showTechniquePicker, setShowTechniquePicker] = useState(false);

  const sitesQuery = trpc.radiobiology.getSites.useQuery();
  const techniquesQuery = trpc.radiobiology.getTechniques.useQuery();
  const modelsQuery = trpc.radiobiology.getModels.useQuery({
    structureType,
  });
  const siteOrgansQuery = trpc.radiobiology.getSiteOrgans.useQuery({
    siteId: cancerSite,
    role: structureType,
  });

  const organsQuery = trpc.radiobiology.getOrgans.useQuery();
  const paramsQuery = trpc.radiobiology.getParameters.useQuery(
    { organ: selectedOrgan, model: selectedModel },
    { enabled: !!selectedOrgan },
  );

  const fallbackOrgans: Organ[] = [
    { name: "Parotid", category: "OAR" },
    { name: "Larynx", category: "OAR" },
    { name: "PTV", category: "Target" },
  ];

  // Legacy mock fallback if API unavailable
  const mockParameters: Record<string, Record<string, Parameter>> = {
    Parotid: {
      lkb_loglogit: {
        td50: 28.4,
        gamma50: 1.0,
        m: 0.25,
        n: 0.45,
        alphaBeta: 3,
        d50: 26.3,
        gamma: 0.73,
        s: 0.01,
      },
      lkb_probit: {
        td50: 28.4,
        gamma50: 1.0,
        m: 0.18,
        n: 0.45,
        alphaBeta: 3,
        d50: 26.3,
        gamma: 0.73,
        s: 0.01,
      },
      poisson: {
        td50: 28.4,
        gamma50: 1.0,
        m: 0.25,
        n: 0.45,
        alphaBeta: 3,
        d50: 26.3,
        gamma: 0.73,
        s: 0.01,
      },
    },
    Larynx: {
      lkb_loglogit: {
        td50: 44.0,
        gamma50: 1.0,
        m: 0.2,
        n: 1.0,
        alphaBeta: 3,
        d50: 40.0,
        gamma: 1.2,
        s: 0.12,
      },
      lkb_probit: {
        td50: 44.0,
        gamma50: 1.0,
        m: 0.2,
        n: 1.0,
        alphaBeta: 3,
        d50: 40.0,
        gamma: 1.2,
        s: 0.12,
      },
      poisson: {
        td50: 44.0,
        gamma50: 1.0,
        m: 0.2,
        n: 1.0,
        alphaBeta: 3,
        d50: 40.0,
        gamma: 1.2,
        s: 0.12,
      },
    },
    PTV: {
      lkb_loglogit: {
        td50: 50.0,
        gamma50: 1.5,
        m: 0.1,
        n: 0.5,
        alphaBeta: 10,
        d50: 48.0,
        gamma: 1.2,
        s: 0.5,
      },
      lkb_probit: {
        td50: 50.0,
        gamma50: 1.5,
        m: 0.1,
        n: 0.5,
        alphaBeta: 10,
        d50: 48.0,
        gamma: 1.2,
        s: 0.5,
      },
      poisson: {
        td50: 50.0,
        gamma50: 1.5,
        m: 0.1,
        n: 0.5,
        alphaBeta: 10,
        d50: 48.0,
        gamma: 1.2,
        s: 0.5,
      },
    },
  };

  const organList = useMemo(() => {
    if (siteOrgansQuery.data?.success && Array.isArray(siteOrgansQuery.data.data)) {
      const names = siteOrgansQuery.data.data as string[];
      if (names.length > 0) {
        return names.map((name) => ({
          name,
          category: structureType === "target" ? "Target" : "OAR",
        }));
      }
    }
    if (organsQuery.data?.success && Array.isArray(organsQuery.data.data)) {
      return (organsQuery.data.data as string[]).map((name) => ({
        name,
        category: /ptv|gtv|ctv/i.test(name) ? "Target" : "OAR",
      }));
    }
    return fallbackOrgans;
  }, [siteOrgansQuery.data, organsQuery.data, structureType]);

  useEffect(() => {
    if (dvhBundle && cancerSite === "UNKNOWN") {
      const inferred = inferCancerSiteFromStructureNames(
        fileStructures,
        importedFileName,
      );
      if (inferred.siteId !== "UNKNOWN" && inferred.confidence === "high") {
        setCancerSite(inferred.siteId);
      }
    }
    setOrgans(organList);
    if (!organList.find((o) => o.name === selectedOrgan) && organList[0]) {
      setSelectedOrgan(organList[0].name);
    }
    const dvhPending =
      !clientLoaded || (!!serverDvhSessionId && serverDvhQuery.isLoading);
    setLoading(
      dvhPending || !dvhBundle || siteOrgansQuery.isLoading || organsQuery.isLoading,
    );
  }, [
    organList,
    siteOrgansQuery.isLoading,
    organsQuery.isLoading,
    clientLoaded,
    serverDvhSessionId,
    serverDvhQuery.isLoading,
    dvhBundle,
    selectedOrgan,
  ]);

  useEffect(() => {
    if (dvhBundle?.patientInfo?.patientId) {
      setPatientId(String(dvhBundle.patientInfo.patientId));
    }
  }, [dvhBundle]);

  useEffect(() => {
    if (fileStructures.length === 0 || !dvhBundle) return;
    if (!selectedStructure || !fileStructures.includes(selectedStructure)) {
      const first = fileStructures[0];
      setSelectedStructure(first);
      const meta = dvhBundle.structures?.find((s) => s.name === first);
      const role = inferEvaluationRole(first, importedFileName, meta?.type);
      setStructureType(role);
      setSelectedModel(defaultModelForRole(role) as ModelId);
      const lit =
        literatureOrganForRole(first, importedFileName) ??
        mapToLiteratureOrgan(first, importedFileName);
      if (lit && organList.some((o) => o.name === lit)) {
        setSelectedOrgan(lit);
      }
    }
  }, [fileStructures, dvhBundle, selectedStructure, importedFileName, organList]);

  const applyLiteratureParams = useCallback(() => {
    if (paramsQuery.data?.success && paramsQuery.data.data) {
      setParameters(paramsQuery.data.data as Parameter);
      return;
    }
    const organParams = mockParameters[selectedOrgan];
    if (organParams?.[selectedModel]) {
      setParameters(organParams[selectedModel]);
    }
  }, [paramsQuery.data, selectedOrgan, selectedModel]);

  useEffect(() => {
    if (!useCustomParams) {
      applyLiteratureParams();
    }
  }, [useCustomParams, applyLiteratureParams]);

  const updateParam = (key: keyof Parameter, value: string) => {
    const n = parseFloat(value);
    if (!parameters || Number.isNaN(n)) return;
    setParameters({ ...parameters, [key]: n });
    setUseCustomParams(true);
  };

  const handleStructureSelect = (name: string, bundle: ParsedDvhBundle | null) => {
    setSelectedStructure(name);
    const role = inferEvaluationRole(name, importedFileName, bundle?.structures?.find((s) => s.name === name)?.type);
    setStructureType(role);
    setSelectedModel(defaultModelForRole(role) as ModelId);
    const lit = literatureOrganForRole(name, importedFileName) ?? mapToLiteratureOrgan(name, importedFileName);
    if (lit) setSelectedOrgan(lit);
    setShowStructurePicker(false);
  };

  const handleOrganSelect = (organ: string) => {
    setSelectedOrgan(organ);
    const cat = organList.find((o) => o.name === organ);
    setStructureType(
      cat?.category === "Target" ? "target" : inferStructureType(organ),
    );
    setShowOrganPicker(false);
  };

  const handleModelSelect = (model: ModelId) => {
    setSelectedModel(model);
    setShowModelPicker(false);
  };

  const applyTechniqueDefaults = (techId: string) => {
    const list = techniquesQuery.data?.data as
      | { id: string; defaultTotalDoseGy: number; defaultFractions: number }[]
      | undefined;
    const t = list?.find((x) => x.id === techId);
    if (t) {
      setTotalDose(String(t.defaultTotalDoseGy));
      setNumFractions(String(t.defaultFractions));
    }
  };

  const handleCalculate = () => {
    const dose = parseFloat(totalDose);
    const fractions = parseInt(numFractions);

    if (isNaN(dose) || dose <= 0) {
      Alert.alert("Error", "Please enter a valid total dose");
      return;
    }

    if (isNaN(fractions) || fractions <= 0) {
      Alert.alert("Error", "Please enter a valid number of fractions");
      return;
    }

    if (!dvhBundle) {
      Alert.alert("Error", dvhLoadError ?? "No DVH data available");
      return;
    }

    const structureKey =
      selectedStructure ||
      fileStructures[0] ||
      selectedOrgan;
    const planMeta = analyzePlanScope(dvhBundle);
    const geudA = parseFloat(geudExponent);
    const paramsPayload = useCustomParams && parameters ? parameters : undefined;

    router.push({
      pathname: "/calculation-results",
      params: {
        dvhSessionId,
        ...(serverDvhSessionId ? { serverDvhSessionId } : {}),
        fileName: importedFileName,
        planScope: planMeta.scope,
        therapeuticWindowEligible: planMeta.therapeuticWindowEligible ? "1" : "0",
        totalDose: dose.toString(),
        numFractions: fractions.toString(),
        organ: selectedOrgan,
        structureName: structureKey,
        structureType,
        model: selectedModel,
        cancerSite,
        technique,
        targetType: structureType === "target" ? targetType : "",
        patientId: patientId.trim() || "—",
        planLabel: planLabel.trim() || "Plan",
        geudExponent: Number.isNaN(geudA) ? "1" : String(geudA),
        parametersJSON: paramsPayload ? JSON.stringify(paramsPayload) : "",
        useCustomParams: useCustomParams ? "1" : "0",
        clinicalJSON: JSON.stringify(clinical),
      },
    });
  };

  const modelOptions = useMemo(() => {
    if (modelsQuery.data?.success && Array.isArray(modelsQuery.data.data)) {
      return modelsQuery.data.data as { id: ModelId; label: string }[];
    }
    const fallback: { id: ModelId; label: string }[] =
      structureType === "target"
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
    return fallback;
  }, [modelsQuery.data, structureType]);

  const siteOptions = useMemo(() => {
    if (sitesQuery.data?.success && Array.isArray(sitesQuery.data.data)) {
      return sitesQuery.data.data as { id: string; label: string }[];
    }
    return [
      { id: "UNKNOWN", label: "Select cancer site (required)" },
      { id: "HN", label: "Head & Neck" },
      { id: "LUNG", label: "Lung" },
      { id: "BREAST", label: "Breast" },
      { id: "PROSTATE", label: "Prostate" },
      { id: "RECTUM", label: "Rectum" },
      { id: "CERVIX", label: "Cervix" },
      { id: "BRAIN", label: "Brain" },
    ];
  }, [sitesQuery.data]);

  const dosePerFraction = (parseFloat(totalDose) / parseInt(numFractions)).toFixed(2);
  const bed = (
    parseFloat(totalDose) *
    (1 + parseFloat(dosePerFraction) / (parameters?.alphaBeta || 3))
  ).toFixed(2);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6 pb-8 px-4 pt-4">
          {dvhLoadError && (
            <View
              className="rounded-lg p-3"
              style={{ backgroundColor: colors.error + "20", borderColor: colors.error, borderWidth: 1 }}
            >
              <Text style={{ color: colors.error }}>{dvhLoadError}</Text>
            </View>
          )}
          {/* Header */}
          <View className="gap-2">
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.foreground}
                />
                <Text
                  className="text-lg font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Plan evaluation setup
                </Text>
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                  One patient · one plan · physical + biological metrics
                </Text>
              </View>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <View className="gap-3">
                <Text
                  className="text-lg font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Patient & plan
                </Text>
                <View className="gap-2">
                  <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                    Patient ID
                  </Text>
                  <TextInput
                    value={patientId}
                    onChangeText={setPatientId}
                    placeholder="e.g. HN-001"
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View className="gap-2">
                  <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                    Plan label
                  </Text>
                  <TextInput
                    value={planLabel}
                    onChangeText={setPlanLabel}
                    placeholder="e.g. IMRT_v2"
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>

              <View className="gap-3">
                <Text className="text-lg font-semibold text-foreground" style={{ color: colors.foreground }}>
                  Cancer site
                </Text>
                <Pressable onPress={() => setShowSitePicker(!showSitePicker)}>
                  <View
                    className="rounded-lg p-3 flex-row justify-between"
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ color: colors.foreground }}>
                      {siteOptions.find((s) => s.id === cancerSite)?.label ?? cancerSite}
                    </Text>
                    <MaterialIcons name="expand-more" size={22} color={colors.muted} />
                  </View>
                </Pressable>
                {showSitePicker && (
                  <View style={{ backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                    {siteOptions.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          setCancerSite(s.id);
                          setShowSitePicker(false);
                        }}
                      >
                        <Text className="p-3" style={{ color: colors.foreground }}>{s.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View className="gap-3">
                <Text className="text-lg font-semibold text-foreground" style={{ color: colors.foreground }}>
                  Technique
                </Text>
                <Pressable onPress={() => setShowTechniquePicker(!showTechniquePicker)}>
                  <View
                    className="rounded-lg p-3 flex-row justify-between"
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ color: colors.foreground }}>{technique}</Text>
                    <MaterialIcons name="expand-more" size={22} color={colors.muted} />
                  </View>
                </Pressable>
                {showTechniquePicker && (
                  <View style={{ backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                    {(techniquesQuery.data?.data as { id: string; label: string }[] | undefined)?.map((t) => (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          setTechnique(t.id);
                          applyTechniqueDefaults(t.id);
                          setShowTechniquePicker(false);
                        }}
                      >
                        <Text className="p-3" style={{ color: colors.foreground }}>{t.label}</Text>
                      </Pressable>
                    )) ?? (
                      ["3DCRT", "IMRT", "VMAT", "IGRT", "SRT", "SBRT"].map((t) => (
                        <Pressable key={t} onPress={() => { setTechnique(t); setShowTechniquePicker(false); }}>
                          <Text className="p-3" style={{ color: colors.foreground }}>{t}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
                <Text className="text-xs text-muted" style={{ color: colors.muted }}>
                  IGRT uses the same LQ model as IMRT/VMAT for the delivered fractionation.
                </Text>
              </View>

              {structureType === "target" && (
                <View className="gap-2">
                  <Text className="text-sm text-muted" style={{ color: colors.muted }}>Target type (TCP)</Text>
                  <View className="flex-row gap-2">
                    {(["GTV", "CTV", "PTV"] as const).map((t) => (
                      <Pressable key={t} onPress={() => setTargetType(t)}>
                        <View
                          className="px-4 py-2 rounded-lg"
                          style={{
                            backgroundColor: targetType === t ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text style={{ color: targetType === t ? "#fff" : colors.foreground }}>{t}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {fileStructures.length > 0 && (
                <View className="gap-2">
                  <Text
                    className="text-lg font-semibold text-foreground"
                    style={{ color: colors.foreground }}
                  >
                    Structure from DVH
                  </Text>
                  <Pressable onPress={() => setShowStructurePicker(!showStructurePicker)}>
                    <View
                      className="rounded-lg p-3 flex-row justify-between items-center"
                      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text style={{ color: colors.foreground }}>
                        {selectedStructure || fileStructures[0]} ({structureType === "target" ? "Target" : "OAR"})
                      </Text>
                      <MaterialIcons name="expand-more" size={22} color={colors.muted} />
                    </View>
                  </Pressable>
                  {showStructurePicker && (
                    <View
                      className="rounded-lg overflow-hidden"
                      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                    >
                      {fileStructures.map((name) => (
                        <Pressable
                          key={name}
                          onPress={() => handleStructureSelect(name, dvhBundle)}
                        >
                          <View className="p-3 border-b" style={{ borderColor: colors.border }}>
                            <Text style={{ color: colors.foreground }}>{name}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Fractionation Section */}
              <View className="gap-3">
                <Text
                  className="text-lg font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Fractionation Scheme
                </Text>

                {/* Total Dose Input */}
                <View className="gap-2">
                  <Text
                    className="text-sm font-medium text-muted"
                    style={{ color: colors.muted }}
                  >
                    Total Dose (Gy)
                  </Text>
                  <TextInput
                    value={totalDose}
                    onChangeText={setTotalDose}
                    placeholder="70"
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 16,
                    }}
                    placeholderTextColor={colors.muted}
                  />
                </View>

                {/* Number of Fractions Input */}
                <View className="gap-2">
                  <Text
                    className="text-sm font-medium text-muted"
                    style={{ color: colors.muted }}
                  >
                    Number of Fractions
                  </Text>
                  <TextInput
                    value={numFractions}
                    onChangeText={setNumFractions}
                    placeholder="35"
                    keyboardType="number-pad"
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 16,
                    }}
                    placeholderTextColor={colors.muted}
                  />
                </View>

                {/* Calculated Values */}
                <View
                  className="rounded-lg p-3 gap-2"
                  style={{ backgroundColor: colors.surface }}
                >
                  <View className="flex-row justify-between">
                    <Text
                      className="text-sm text-muted"
                      style={{ color: colors.muted }}
                    >
                      Dose per Fraction:
                    </Text>
                    <Text
                      className="text-sm font-semibold text-foreground"
                      style={{ color: colors.foreground }}
                    >
                      {dosePerFraction} Gy
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className="text-sm text-muted"
                      style={{ color: colors.muted }}
                    >
                      BED (α/β={parameters?.alphaBeta}):
                    </Text>
                    <Text
                      className="text-sm font-semibold text-foreground"
                      style={{ color: colors.foreground }}
                    >
                      {bed} Gy
                    </Text>
                  </View>
                </View>
              </View>

              {/* Model Selection */}
              <View className="gap-3">
                <Text
                  className="text-lg font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Calculation Model
                </Text>

                <Pressable
                  onPress={() => setShowModelPicker(!showModelPicker)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    className="rounded-lg p-4 flex-row items-center justify-between border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    }}
                  >
                    <View>
                      <Text
                        className="text-sm text-muted"
                        style={{ color: colors.muted }}
                      >
                        Model
                      </Text>
                      <Text
                        className="text-base font-semibold text-foreground"
                        style={{ color: colors.foreground }}
                      >
                        {modelOptions.find((m) => m.id === selectedModel)?.label ?? selectedModel}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={showModelPicker ? "expand-less" : "expand-more"}
                      size={24}
                      color={colors.muted}
                    />
                  </View>
                </Pressable>

                {showModelPicker && (
                  <View
                    className="rounded-lg overflow-hidden border"
                    style={{ borderColor: colors.border }}
                  >
                    {modelOptions.map((item) => {
                      const model = item.id;
                      return (
                        <Pressable
                          key={model}
                          onPress={() => handleModelSelect(model)}
                          style={({ pressed }) => [
                            {
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <View
                            className="p-4 flex-row items-center justify-between border-b"
                            style={{
                              backgroundColor:
                                selectedModel === model
                                  ? colors.primary + "20"
                                  : colors.surface,
                              borderColor: colors.border,
                            }}
                          >
                              <Text
                                className="font-medium text-foreground"
                                style={{ color: colors.foreground }}
                              >
                                {item.label}
                              </Text>
                            {selectedModel === model && (
                              <MaterialIcons
                                name="check"
                                size={20}
                                color={colors.primary}
                              />
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Organ Selection */}
              <View className="gap-3">
                <Text
                  className="text-lg font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  Organ / Structure
                </Text>

                <Pressable
                  onPress={() => setShowOrganPicker(!showOrganPicker)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    className="rounded-lg p-4 flex-row items-center justify-between border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    }}
                  >
                    <View>
                      <Text
                        className="text-sm text-muted"
                        style={{ color: colors.muted }}
                      >
                        Selected Organ
                      </Text>
                      <Text
                        className="text-base font-semibold text-foreground"
                        style={{ color: colors.foreground }}
                      >
                        {selectedOrgan}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={showOrganPicker ? "expand-less" : "expand-more"}
                      size={24}
                      color={colors.muted}
                    />
                  </View>
                </Pressable>

                {showOrganPicker && (
                  <View
                    className="rounded-lg overflow-hidden border max-h-64"
                    style={{ borderColor: colors.border }}
                  >
                    <FlatList
                      data={organs}
                      keyExtractor={(item) => item.name}
                      scrollEnabled={true}
                      renderItem={({ item }) => (
                        <Pressable
                          onPress={() => handleOrganSelect(item.name)}
                          style={({ pressed }) => [
                            {
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <View
                            className="p-4 flex-row items-center justify-between border-b"
                            style={{
                              backgroundColor:
                                selectedOrgan === item.name
                                  ? colors.primary + "20"
                                  : colors.surface,
                              borderColor: colors.border,
                            }}
                          >
                            <View>
                              <Text
                                className="font-medium text-foreground"
                                style={{ color: colors.foreground }}
                              >
                                {item.name}
                              </Text>
                              <Text
                                className="text-xs text-muted"
                                style={{ color: colors.muted }}
                              >
                                {item.category}
                              </Text>
                            </View>
                            {selectedOrgan === item.name && (
                              <MaterialIcons
                                name="check"
                                size={20}
                                color={colors.primary}
                              />
                            )}
                          </View>
                        </Pressable>
                      )}
                    />
                  </View>
                )}
              </View>

              <View className="gap-2">
                <Text className="text-sm font-medium" style={{ color: colors.muted }}>
                  Evaluation role
                </Text>
                <View className="flex-row gap-2">
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
                        setSelectedModel(defaultModelForRole(role) as ModelId);
                      }}
                    >
                      <View
                        className="px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor:
                            structureType === role ? colors.primary : colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text
                          className="text-xs"
                          style={{ color: structureType === role ? "#fff" : colors.foreground }}
                        >
                          {label}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <Text className="text-xs" style={{ color: colors.muted }}>
                  Auto-set from structure (e.g. combined parotid → NTCP). Override only if TPS label is ambiguous.
                </Text>
              </View>

              <ClinicalContextForm
                value={clinical}
                onChange={setClinical}
                cancerSite={cancerSite}
                structureType={structureType}
                organ={selectedOrgan}
                colors={colors}
              />

              {parameters && (
                <View className="gap-3">
                  <View className="flex-row justify-between items-center">
                    <Text
                      className="text-lg font-semibold text-foreground"
                      style={{ color: colors.foreground }}
                    >
                      Model parameters
                    </Text>
                    <Pressable
                      onPress={() => {
                        setUseCustomParams(false);
                        applyLiteratureParams();
                      }}
                    >
                      <Text className="text-sm" style={{ color: colors.primary }}>
                        Reset to literature
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setUseCustomParams(!useCustomParams)}>
                    <View className="flex-row items-center gap-2 py-1">
                      <MaterialIcons
                        name={useCustomParams ? "check-box" : "check-box-outline-blank"}
                        size={22}
                        color={colors.primary}
                      />
                      <Text style={{ color: colors.foreground }}>Edit parameters manually</Text>
                    </View>
                  </Pressable>
                  <Text className="text-xs text-muted" style={{ color: colors.muted }}>
                    {useCustomParams
                      ? "Manual override active — tap Reset to restore literature values"
                      : "Literature defaults (QUANTEC / site tables)"}
                  </Text>
                  <View className="gap-2">
                    <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                      gEUD exponent a
                    </Text>
                    <TextInput
                      value={geudExponent}
                      onChangeText={setGeudExponent}
                      keyboardType="decimal-pad"
                      style={{
                        backgroundColor: colors.surface,
                        color: colors.foreground,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 10,
                      }}
                    />
                  </View>
                  {(
                    [
                      ["TD50 (Gy)", "td50"],
                      ["γ50", "gamma50"],
                      ["m", "m"],
                      ["n", "n"],
                      ["α/β (Gy)", "alphaBeta"],
                      ["D50 (Gy)", "d50"],
                      ["γ", "gamma"],
                      ["s (seriality)", "s"],
                    ] as const
                  ).map(([label, key]) => (
                    <View key={key} className="flex-row items-center gap-2">
                      <Text className="w-28 text-xs text-muted" style={{ color: colors.muted }}>
                        {label}
                      </Text>
                      <TextInput
                        value={String(parameters[key])}
                        onChangeText={(v) => updateParam(key, v)}
                        keyboardType="decimal-pad"
                        style={{
                          flex: 1,
                          backgroundColor: colors.surface,
                          color: colors.foreground,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 8,
                          padding: 8,
                          fontSize: 14,
                        }}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Calculate Button */}
              <Pressable
                onPress={handleCalculate}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <View
                  className="rounded-lg py-4 items-center justify-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text
                    className="font-semibold text-base"
                    style={{ color: "#ffffff" }}
                  >
                    Evaluate plan
                  </Text>
                </View>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
