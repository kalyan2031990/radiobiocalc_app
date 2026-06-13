/**
 * Calculation Results Screen
 * 
 * Displays:
 * - TCP/NTCP results
 * - Dose metrics (Vxx, Dxx, gEUD)
 * - BED/EQD2 calculations
 * - Model parameters used
 * - Visualization options
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";
import {
  computePlanDescriptiveStats,
  type PlanDescriptiveStats,
} from "@/lib/plan-evaluation";
import {
  parseClinicalContext,
  clinicalContextSummary,
} from "@/lib/clinical-context";
import { loadDvhSession } from "@/lib/dvh-session";
import type { ParsedDvhBundle } from "@/lib/plan-evaluation";
import { doseMetricsRowsForEvaluation } from "@/lib/dose-metrics-guidelines";
import { savePlanEvalSession } from "@/lib/plan-eval-session";
import { ParameterProvenancePanel } from "@/components/parameter-provenance-panel";
import { RbXExplanationPanel } from "@/components/rbx-explanation-panel";
import { usesLocalEngine } from "@/lib/offline-mode";
import { buildSingleStructureExplanation } from "@/lib/rbgyanx-explain";
import { applyManuscriptCovariates } from "@/lib/manuscript-covariates";
import { resolveClinicalForCovariates } from "@/lib/clinical-context-covariates";
import type { ClinicalRecord } from "@/lib/clinical-xlsx-core";
import { ClinicalDataPanelCompact } from "@/components/clinical-data-panel";
import { clinicalDataStatusLabel } from "@/lib/clinical-data-service";
import {
  defaultCompositeNtcpModel,
  defaultCompositeTcpModel,
} from "@/lib/structure-role";
import { TcpModelCaution } from "@/components/tcp-model-caution";
import { capTcpForDisplay, formatTcpPercent } from "@/lib/tcp-display";

interface DoseMetrics {
  meanDose: number;
  maxDose: number;
  minDose: number;
  gEUD: number;
  eud?: number;
  totalVolume?: number;
  vxx: Record<number, number>;
  dxx: Record<number, number>;
  d95?: number;
  d98?: number;
  d50?: number;
  d2?: number;
  v95?: number;
  v100?: number;
  v107?: number;
}

interface CalculationResult {
  tcp?: number;
  ntcp?: number;
  baseTcp?: number;
  baseNtcp?: number;
  covariatesApplied?: boolean;
  clinicalSyntheticFlag?: boolean;
  clinicalDataSource?: string;
  bed: number;
  eqd2: number;
  doseMetrics: DoseMetrics;
  organ: string;
  model: string;
  parameters?: Record<string, number>;
  lqCaution?: boolean;
  zmDetails?: { nEff: number; p0SingleCell: number; repopFactor: number };
}

type ResultTab =
  | "summary"
  | "physical"
  | "bio"
  | "stats"
  | "params"
  | "gyan"
  | "clinical";

export default function CalculationResultsScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams();

  const dvhSessionId = params.dvhSessionId as string;
  const serverDvhSessionId = params.serverDvhSessionId as string | undefined;
  const therapeuticWindowEligible = params.therapeuticWindowEligible === "1";
  const totalDose = parseFloat(params.totalDose as string);
  const numFractions = parseInt(params.numFractions as string);
  const organ = params.organ as string;
  const structureName = (params.structureName as string) || organ;
  const structureType = (params.structureType as "target" | "oar") || "oar";
  const model = params.model as string;
  const patientId = params.patientId as string;
  const planLabel = params.planLabel as string;
  const geudExponent = parseFloat((params.geudExponent as string) || "1");
  const parametersJSON = params.parametersJSON as string;
  const cancerSite = (params.cancerSite as string) || "HN";
  const technique = (params.technique as string) || "IMRT";
  const targetType = (params.targetType as string) || "PTV";
  const applyClinicalCovariates = params.applyClinicalCovariates === "1";
  const clinicalRecord = useMemo((): ClinicalRecord | null => {
    const raw = params.clinicalRecordJSON as string;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ClinicalRecord;
    } catch {
      return null;
    }
  }, [params.clinicalRecordJSON]);
  const clinicalContext = useMemo(
    () => parseClinicalContext(params.clinicalJSON as string),
    [params.clinicalJSON],
  );
  const clinicalRows = useMemo(
    () =>
      clinicalContextSummary(
        clinicalContext,
        cancerSite,
        structureType,
        organ,
      ),
    [clinicalContext, cancerSite, structureType, organ],
  );

  const customParameters = useMemo(() => {
    if (!parametersJSON) return undefined;
    try {
      return JSON.parse(parametersJSON) as Record<string, number>;
    } catch {
      return undefined;
    }
  }, [parametersJSON]);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [planStats, setPlanStats] = useState<PlanDescriptiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [twLoading, setTwLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>("summary");

  const evaluatePlanMutation = trpc.radiobiology.evaluateCompositePlan.useMutation();

  const calculateMutation = trpc.radiobiology.calculate.useMutation();
  const serverDvhQuery = trpc.radiobiology.getDvhSession.useQuery(
    { sessionId: serverDvhSessionId! },
    { enabled: !!serverDvhSessionId },
  );

  useEffect(() => {
    performCalculation();
  }, [dvhSessionId, serverDvhSessionId, serverDvhQuery.data, serverDvhQuery.isLoading]);

  const guidelineMetrics = useMemo(() => {
    if (!result?.doseMetrics) return [];
    return doseMetricsRowsForEvaluation(structureType, organ, result.doseMetrics);
  }, [result, structureType, organ]);

  const rbxExplanation = useMemo(() => {
    if (!result) return null;
    return buildSingleStructureExplanation({
      structureType,
      organ,
      model: result.model,
      structureName,
      tcp: result.tcp,
      ntcp: result.ntcp,
      doseMetrics: result.doseMetrics,
      totalDose,
      numFractions,
      technique,
      bed: result.bed,
      eqd2: result.eqd2,
    });
  }, [result, structureType, organ, structureName, totalDose, numFractions, technique]);

  const performCalculation = async () => {
    try {
      setLoading(true);

      let dvhData: ParsedDvhBundle | null = dvhSessionId
        ? await loadDvhSession(dvhSessionId)
        : null;
      if (!dvhData && serverDvhQuery.data?.success) {
        dvhData = serverDvhQuery.data.data as ParsedDvhBundle;
      }
      if (!dvhData && serverDvhSessionId && serverDvhQuery.isLoading) {
        return;
      }
      if (!dvhData) {
        Alert.alert("Error", "No DVH data — re-import the plan file");
        setLoading(false);
        return;
      }

      const dvhPoints =
        dvhData.dvhByStructure?.[structureName] ??
        dvhData.dvhByStructure?.[organ] ??
        [];
      const points = dvhPoints.map((p: { dose: number; volume: number }) => ({
        dose: p.dose,
        volume: p.volume,
      }));

      setPlanStats(computePlanDescriptiveStats(points));

      let data;
      if (usesLocalEngine()) {
        const { offlineCalculate } = await import("@/lib/offline-engine");
        data = offlineCalculate({
          dvh: points,
          totalDose,
          numFractions,
          organ,
          structureType,
          model: model as
            | "lkb_loglogit"
            | "lkb_probit"
            | "poisson"
            | "zaider_minerbo"
            | "poisson_dvh",
          cancerSite,
          technique,
          targetType: structureType === "target" ? targetType : undefined,
          parameters: customParameters,
          geudExponent: Number.isNaN(geudExponent) ? 1 : geudExponent,
        });
      } else {
        const response = await calculateMutation.mutateAsync({
          dvh: points,
          totalDose,
          numFractions,
          organ,
          structureType,
          model: model as
            | "lkb_loglogit"
            | "lkb_probit"
            | "poisson"
            | "zaider_minerbo"
            | "poisson_dvh",
          cancerSite,
          technique,
          targetType: structureType === "target" ? targetType : undefined,
          parameters: customParameters,
          geudExponent: Number.isNaN(geudExponent) ? 1 : geudExponent,
        });

        if (!response.success || !response.data) {
          Alert.alert("Calculation failed", response.error ?? "Unknown error");
          return;
        }
        data = response.data;
      }

      let tcp = data.tcp;
      let ntcp = data.ntcp;
      let covariatesApplied = false;
      const cov = resolveClinicalForCovariates({
        ctx: clinicalContext,
        xlsxRecord: clinicalRecord,
        patientId,
        organ,
        isTarget: structureType === "target",
        totalDoseGy: totalDose,
        fractions: numFractions,
        toggleOn: applyClinicalCovariates,
      });
      if (cov.apply && cov.record) {
        const adj = applyManuscriptCovariates(
          data.tcp,
          data.ntcp,
          cov.record,
          organ,
        );
        if (structureType === "target" && adj.adjustedTcp != null && data.tcp != null) {
          tcp = adj.adjustedTcp;
          covariatesApplied = adj.factorsApplied.length > 0;
        }
        if (structureType === "oar" && adj.adjustedNtcp != null && data.ntcp != null) {
          ntcp = adj.adjustedNtcp;
          covariatesApplied = adj.factorsApplied.length > 0;
        }
      }

      setResult({
        tcp,
        ntcp,
        baseTcp: data.tcp,
        baseNtcp: data.ntcp,
        covariatesApplied,
        clinicalSyntheticFlag: clinicalRecord?.syntheticFlag,
        clinicalDataSource: clinicalRecord?.dataSource,
        bed: data.bed,
        eqd2: data.eqd2,
        doseMetrics: data.doseMetrics as DoseMetrics,
        organ: data.organ,
        model: data.model,
        parameters: data.parameters as unknown as Record<string, number> | undefined,
        lqCaution: data.lqCaution as boolean | undefined,
        zmDetails: data.zmDetails as CalculationResult["zmDetails"],
      });
    } catch (error) {
      console.error("Calculation error:", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      Alert.alert(
        "Error",
        `Failed to perform calculation. API: ${getApiBaseUrl()}\n${msg}`,
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          className="mt-4 text-muted"
          style={{ color: colors.muted }}
        >
          Calculating...
        </Text>
      </ScreenContainer>
    );
  }

  if (!result) {
    return (
      <ScreenContainer className="bg-background">
        <Text
          className="text-foreground text-center"
          style={{ color: colors.foreground }}
        >
          No results available
        </Text>
      </ScreenContainer>
    );
  }

  const isTarget = structureType === "target";
  const tcpShown = result.tcp != null ? capTcpForDisplay(result.tcp) : null;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6 pb-8 px-4 pt-4">
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
                  Calculation Results
                </Text>
              </View>
            </Pressable>
            <Text className="text-sm text-muted" style={{ color: colors.muted }}>
              {patientId} · {planLabel}
            </Text>
            <Text className="text-sm text-muted" style={{ color: colors.muted }}>
              {structureName} ({structureType === "target" ? "Target" : "OAR"}) · {technique} · {result.model}
            </Text>
            {clinicalRecord ? (
              <ClinicalDataPanelCompact
                applyCovariates={!!result.covariatesApplied}
                syntheticFlag={!!result.clinicalSyntheticFlag}
                dataSource={clinicalDataStatusLabel(clinicalRecord)}
              />
            ) : null}
            {result.covariatesApplied && result.baseTcp != null && result.tcp != null ? (
              <Text className="text-xs" style={{ color: colors.muted }}>
                TCP base {formatTcpPercent(result.baseTcp)} → adjusted {formatTcpPercent(result.tcp)}
              </Text>
            ) : null}
            {result.covariatesApplied && result.baseNtcp != null && result.ntcp != null ? (
              <Text className="text-xs" style={{ color: colors.muted }}>
                NTCP base {(result.baseNtcp * 100).toFixed(1)}% → adjusted {(result.ntcp * 100).toFixed(1)}%
              </Text>
            ) : null}
            {result.lqCaution && (
              <Text className="text-xs" style={{ color: colors.warning }}>
                LQ caution: high dose per fraction — review BED/EQD2 for {technique}.
              </Text>
            )}
          </View>

          {/* Main Result Card */}
          <View
            className="rounded-2xl p-6 gap-4"
            style={{ backgroundColor: colors.surface }}
          >
            {structureType === "target" && result.tcp != null && tcpShown ? (
              <>
                <View className="items-center gap-2">
                  <Text
                    className="text-sm text-muted"
                    style={{ color: colors.muted }}
                  >
                    Tumor Control Probability
                  </Text>
                  <Text
                    className="text-5xl font-bold"
                    style={{ color: colors.primary }}
                  >
                    {formatTcpPercent(result.tcp!)}
                  </Text>
                </View>

                {/* TCP Status */}
                <View
                  className="rounded-lg p-3 flex-row items-center gap-2"
                  style={{
                    backgroundColor:
                      tcpShown.display > 0.9
                        ? colors.success + "20"
                        : tcpShown.display > 0.7
                        ? colors.warning + "20"
                        : colors.error + "20",
                  }}
                >
                  <MaterialIcons
                    name={
                      tcpShown.display > 0.9
                        ? "check-circle"
                        : tcpShown.display > 0.7
                        ? "warning"
                        : "error"
                    }
                    size={20}
                    color={
                      tcpShown.display > 0.9
                        ? colors.success
                        : tcpShown.display > 0.7
                        ? colors.warning
                        : colors.error
                    }
                  />
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color:
                        tcpShown.display > 0.9
                          ? colors.success
                          : tcpShown.display > 0.7
                          ? colors.warning
                          : colors.error,
                    }}
                  >
                    {tcpShown.display > 0.9
                      ? "Excellent tumor control (model)"
                      : tcpShown.display > 0.7
                      ? "Good tumor control (model)"
                      : "Low tumor control (model)"}
                  </Text>
                </View>

                <TcpModelCaution showCapFootnote={tcpShown.capped} compact />
              </>
            ) : (
              <>
                <View className="items-center gap-2">
                  <Text
                    className="text-sm text-muted"
                    style={{ color: colors.muted }}
                  >
                    Normal Tissue Complication Probability
                  </Text>
                  <Text
                    className="text-5xl font-bold"
                    style={{ color: colors.error }}
                  >
                    {(result.ntcp! * 100).toFixed(1)}%
                  </Text>
                </View>

                {/* NTCP Status */}
                <View
                  className="rounded-lg p-3 flex-row items-center gap-2"
                  style={{
                    backgroundColor:
                      result.ntcp! < 0.1
                        ? colors.success + "20"
                        : result.ntcp! < 0.3
                        ? colors.warning + "20"
                        : colors.error + "20",
                  }}
                >
                  <MaterialIcons
                    name={
                      result.ntcp! < 0.1
                        ? "check-circle"
                        : result.ntcp! < 0.3
                        ? "warning"
                        : "error"
                    }
                    size={20}
                    color={
                      result.ntcp! < 0.1
                        ? colors.success
                        : result.ntcp! < 0.3
                        ? colors.warning
                        : colors.error
                    }
                  />
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color:
                        result.ntcp! < 0.1
                          ? colors.success
                          : result.ntcp! < 0.3
                          ? colors.warning
                          : colors.error,
                    }}
                  >
                    {result.ntcp! < 0.1
                      ? "Low complication risk"
                      : result.ntcp! < 0.3
                      ? "Moderate complication risk"
                      : "High complication risk"}
                  </Text>
                </View>
              </>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {(
                [
                  ["summary", "Summary"],
                  ["physical", "Physical"],
                  ["bio", "Biological"],
                  ["stats", "Statistics"],
                  ["params", "Parameters"],
                  ["gyan", "rb X"],
                  ["clinical", "Clinical"],
                ] as const
              ).map(([tab, label]) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    className="px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor:
                        activeTab === tab ? colors.primary : colors.surface,
                    }}
                  >
                    <Text
                      className="font-medium text-xs"
                      style={{
                        color: activeTab === tab ? "#ffffff" : colors.foreground,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Tab Content */}
          {activeTab === "summary" && (
            <View
              className="rounded-lg p-4 gap-3"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-row justify-between">
                <Text
                  className="text-sm text-muted"
                  style={{ color: colors.muted }}
                >
                  Total Dose:
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  {totalDose.toFixed(1)} Gy
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text
                  className="text-sm text-muted"
                  style={{ color: colors.muted }}
                >
                  Fractions:
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  {numFractions}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text
                  className="text-sm text-muted"
                  style={{ color: colors.muted }}
                >
                  Dose/Fraction:
                </Text>
                <Text
                  className="text-sm font-semibold text-foreground"
                  style={{ color: colors.foreground }}
                >
                  {(totalDose / numFractions).toFixed(2)} Gy
                </Text>
              </View>
            </View>
          )}

          {activeTab === "physical" && (
            <View
              className="rounded-lg p-4 gap-3"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                {structureType === "target"
                  ? "Target metrics (RTOG/ICRU)"
                  : `OAR metrics (QUANTEC-oriented) — ${organ}`}
              </Text>
              {guidelineMetrics.map((row) => (
                <View key={row.label} className="gap-0.5">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                      {row.label}
                    </Text>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: colors.foreground }}
                    >
                      {row.value}
                    </Text>
                  </View>
                  {row.note ? (
                    <Text className="text-xs italic" style={{ color: colors.muted }}>
                      {row.note}
                    </Text>
                  ) : null}
                </View>
              ))}
              {structureType === "oar" && (
                <Text className="text-xs pt-2" style={{ color: colors.muted }}>
                  D95/D98 are not reported for OARs — use Dmean, Dmax, and organ-specific V/D constraints per QUANTEC.
                </Text>
              )}
            </View>
          )}

          {activeTab === "bio" && (
            <View className="rounded-lg p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>BED:</Text>
                <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {result.bed.toFixed(2)} Gy
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>EQD2:</Text>
                <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {result.eqd2.toFixed(2)} Gy
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>gEUD:</Text>
                <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {result.doseMetrics.gEUD.toFixed(2)} Gy
                </Text>
              </View>
              {result.doseMetrics.eud != null && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted" style={{ color: colors.muted }}>EUD:</Text>
                  <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                    {result.doseMetrics.eud.toFixed(2)} Gy
                  </Text>
                </View>
              )}
              <Text className="text-xs text-muted pt-2" style={{ color: colors.muted }}>
                gEUD exponent a = {Number.isNaN(geudExponent) ? 1 : geudExponent}
              </Text>
              {result.zmDetails && (
                <View className="border-t pt-3 mt-2" style={{ borderColor: colors.border }}>
                  <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                    Zaider–Minerbo
                  </Text>
                  <Text className="text-xs text-muted" style={{ color: colors.muted }}>
                    N_eff = {result.zmDetails.nEff.toExponential(3)}, P0 = {result.zmDetails.p0SingleCell.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "stats" && planStats && (
            <View className="rounded-lg p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                Plan QA statistics (single DVH)
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>DVH points:</Text>
                <Text style={{ color: colors.foreground }}>{planStats.nPoints}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>Dose CV:</Text>
                <Text style={{ color: colors.foreground }}>{(planStats.doseCoeffVar * 100).toFixed(1)}%</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>Std dev (Gy):</Text>
                <Text style={{ color: colors.foreground }}>{planStats.doseStdGy.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>Median dose (Gy):</Text>
                <Text style={{ color: colors.foreground }}>{planStats.doseMedianGy.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted" style={{ color: colors.muted }}>Structure volume (cc):</Text>
                <Text style={{ color: colors.foreground }}>{planStats.volumeTotalCc.toFixed(2)}</Text>
              </View>
              <Text className="text-xs leading-relaxed pt-2" style={{ color: colors.muted }}>
                {planStats.interpretation}
              </Text>
            </View>
          )}

          {activeTab === "params" && result.parameters && (
            <View className="rounded-lg p-4 gap-2" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm font-semibold mb-2" style={{ color: colors.foreground }}>
                {result.model === "lkb_loglogit"
                  ? "LKB Log-Logistic"
                  : result.model === "lkb_probit"
                  ? "LKB Probit"
                  : "Poisson"}
              </Text>
              {Object.entries(result.parameters).map(([key, val]) => (
                <View key={key} className="flex-row justify-between">
                  <Text className="text-xs text-muted" style={{ color: colors.muted }}>
                    {key}:
                  </Text>
                  <Text className="text-xs font-mono" style={{ color: colors.foreground }}>
                    {typeof val === "number" ? val.toFixed(4) : String(val)}
                  </Text>
                </View>
              ))}
              <Text className="text-xs text-muted pt-3" style={{ color: colors.muted }}>
                Literature defaults from QUANTEC/RTOG unless manually overridden in setup.
              </Text>
            </View>
          )}

          {activeTab === "gyan" && (
            <View className="rounded-lg p-4 gap-4" style={{ backgroundColor: colors.surface }}>
              {rbxExplanation ? (
                <RbXExplanationPanel explanation={rbxExplanation} />
              ) : null}
              <ParameterProvenancePanel organ={organ} model={model} />
            </View>
          )}

          {activeTab === "clinical" && (
            <View className="rounded-lg p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                Clinical context — {structureType === "target" ? "TCP" : "NTCP"} · {organ}
              </Text>
              {clinicalRows.length === 0 ? (
                <Text className="text-sm" style={{ color: colors.muted }}>
                  No clinical fields entered. Add them in plan setup under “Clinical context”.
                </Text>
              ) : (
                clinicalRows.map((row) => (
                  <View key={row.label} className="flex-row justify-between gap-2">
                    <Text className="text-sm text-muted" style={{ color: colors.muted }}>
                      {row.label}
                    </Text>
                    <Text
                      className="text-sm font-medium flex-1 text-right"
                      style={{ color: colors.foreground }}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))
              )}
              <Text className="text-xs italic pt-2" style={{ color: colors.muted }}>
                {result.covariatesApplied
                  ? "Clinical covariates were applied to TCP/NTCP from linked xlsx and/or fields you entered in Clinical context."
                  : "Enter clinical context fields or link xlsx data to adjust TCP/NTCP; toggle “Apply covariates” for xlsx-only adjustment."}
              </Text>
              {clinicalRecord ? (
                <Text className="text-xs" style={{ color: colors.muted }}>
                  Source: {clinicalDataStatusLabel(clinicalRecord)}
                  {clinicalRecord.syntheticFlag ? " · synthetic-flagged" : ""}
                </Text>
              ) : null}
            </View>
          )}

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/benchmark-comparison",
                params: {
                  organ,
                  structureType,
                  tcp: result.tcp != null ? String(result.tcp) : "",
                  ntcp: result.ntcp != null ? String(result.ntcp) : "",
                },
              })
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginBottom: 8 }]}
          >
            <View
              className="rounded-xl py-3 flex-row items-center justify-center gap-2 border"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <MaterialIcons name="compare-arrows" size={20} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                QUANTEC benchmark comparison
              </Text>
            </View>
          </Pressable>

          {(dvhSessionId || serverDvhSessionId) ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/dvh-visualization",
                  params: {
                    ...(dvhSessionId ? { dvhSessionId } : {}),
                    ...(serverDvhSessionId ? { serverDvhSessionId } : {}),
                    fileName: (params.fileName as string) || "",
                  },
                })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginBottom: 8 }]}
            >
              <View
                className="rounded-xl py-3 flex-row items-center justify-center gap-2 border"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <MaterialIcons name="area-chart" size={20} color={colors.primary} />
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>View plan DVH curves</Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/report-export",
                params: {
                  patientId,
                  planLabel,
                  organ,
                  structureName,
                  structureType,
                  model,
                  cancerSite,
                  technique,
                  totalDose: String(totalDose),
                  numFractions: String(numFractions),
                  ...(dvhSessionId ? { dvhSessionId } : {}),
                  tcp: result.tcp != null ? String(result.tcp) : "",
                  ntcp: result.ntcp != null ? String(result.ntcp) : "",
                  baseTcp: result.baseTcp != null ? String(result.baseTcp) : "",
                  baseNtcp: result.baseNtcp != null ? String(result.baseNtcp) : "",
                  applyClinicalCovariates: result.covariatesApplied ? "1" : "0",
                  clinicalDataNote: clinicalRecord
                    ? `${clinicalRecord.dataSource}${clinicalRecord.syntheticFlag ? " (synthetic-flagged)" : ""}`
                    : "",
                  bed: String(result.bed),
                  eqd2: String(result.eqd2),
                  meanDose: String(result.doseMetrics.meanDose),
                  maxDose: String(result.doseMetrics.maxDose),
                  gEUD: String(result.doseMetrics.gEUD ?? result.doseMetrics.meanDose),
                  td50: String(result.parameters?.td50 ?? result.parameters?.d50 ?? 28),
                  gamma50: String(result.parameters?.gamma50 ?? result.parameters?.gamma ?? 1),
                  chartDose: String(result.doseMetrics.gEUD ?? result.doseMetrics.meanDose),
                  doseMetricsJSON: JSON.stringify(guidelineMetrics),
                  clinicalJSON: (params.clinicalJSON as string) || "",
                  includeClinicalInReport:
                    (params.includeClinicalInReport as string) === "0" ? "0" : "1",
                },
              })
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View
              className="rounded-xl py-4 flex-row items-center justify-center gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              <MaterialIcons name="description" size={22} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700" }}>Export report (PDF / DOCX)</Text>
            </View>
          </Pressable>

          {/* Visualization Buttons */}
          <View className="gap-2 flex-row">
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/dose-response",
                  params: {
                    structureType,
                    organ,
                    model: result.model,
                    totalDose: String(totalDose),
                    numFractions: String(numFractions),
                    probability: String(
                      structureType === "target" ? (result.tcp ?? 0) : (result.ntcp ?? 0),
                    ),
                    td50: String(result.parameters?.td50 ?? result.parameters?.d50 ?? 28),
                    gamma50: String(result.parameters?.gamma50 ?? result.parameters?.gamma ?? 1),
                    geud: String(result.doseMetrics.gEUD ?? result.doseMetrics.meanDose),
                  },
                })
              }
              style={({ pressed }) => [
                { flex: 1, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                className="rounded-lg py-3 items-center justify-center border"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }}
              >
                <MaterialIcons
                  name="show-chart"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  className="text-xs font-medium text-foreground mt-1"
                  style={{ color: colors.foreground }}
                >
                  Dose-Response
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={async () => {
                if (!therapeuticWindowEligible) {
                  Alert.alert(
                    "Therapeutic window",
                    "Requires a plan DVH set with at least one target and one OAR (multiple structures). Single OAR or target files are evaluated with NTCP or TCP only.",
                  );
                  return;
                }
                if (!usesLocalEngine() && !serverDvhSessionId) {
                  Alert.alert(
                    "Therapeutic window",
                    "Re-import the plan DVH so the server session is available, then run calculation again.",
                  );
                  return;
                }
                setTwLoading(true);
                try {
                  let evaluation;
                  if (usesLocalEngine()) {
                    const bundle = dvhSessionId
                      ? await loadDvhSession(dvhSessionId)
                      : null;
                    if (!bundle) {
                      Alert.alert("Plan evaluation", "No DVH data on device");
                      return;
                    }
                    const { offlineEvaluateComposite } = await import("@/lib/offline-engine");
                    evaluation = offlineEvaluateComposite(bundle, {
                      totalDose,
                      numFractions,
                      cancerSite,
                      technique,
                      prescriptionGy: totalDose,
                      fileHint: (params.fileName as string) || planLabel || "",
                    });
                  } else {
                    const evalRes = await evaluatePlanMutation.mutateAsync({
                      sessionId: serverDvhSessionId!,
                      totalDose,
                      numFractions,
                      cancerSite,
                      technique,
                      prescriptionGy: totalDose,
                      tcpModel: defaultCompositeTcpModel(cancerSite) as
                        | "lkb_loglogit"
                        | "lkb_probit"
                        | "poisson"
                        | "zaider_minerbo"
                        | "poisson_dvh",
                      ntcpModel: defaultCompositeNtcpModel() as
                        | "lkb_loglogit"
                        | "lkb_probit"
                        | "poisson"
                        | "zaider_minerbo"
                        | "poisson_dvh",
                    });
                    if (!evalRes.success || !evalRes.data) {
                      Alert.alert(
                        "Plan evaluation",
                        evalRes.error ?? "Could not evaluate composite plan",
                      );
                      return;
                    }
                    evaluation = evalRes.data;
                  }
                  const planEvalSessionId = await savePlanEvalSession(evaluation);
                  router.push({
                    pathname: "/therapeutic-window",
                    params: {
                      planEvalSessionId,
                      totalDose: String(totalDose),
                    },
                  });
                } catch (e) {
                  Alert.alert(
                    "Plan evaluation",
                    e instanceof Error ? e.message : "Unknown error",
                  );
                } finally {
                  setTwLoading(false);
                }
              }}
              disabled={twLoading}
              style={({ pressed }) => [
                {
                  flex: 1,
                  opacity: pressed ? 0.7 : therapeuticWindowEligible ? 1 : 0.45,
                },
              ]}
            >
              <View
                className="rounded-lg py-3 items-center justify-center border"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }}
              >
                <MaterialIcons
                  name="scatter-plot"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  className="text-xs font-medium text-foreground mt-1"
                  style={{ color: colors.foreground }}
                >
                  {twLoading ? "Evaluating…" : "Therapeutic Window"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
