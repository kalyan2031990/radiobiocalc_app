/**
 * DICOM-RT import — on-device parser (RTDOSE embedded DVH + RTSTRUCT ROI names).
 */

import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { saveDvhSession } from "@/lib/dvh-session";
import { savePatientCase } from "@/lib/patient-store";
import {
  isDicomBuffer,
  parseDicomDvhFiles,
  type DicomStructurePreview,
} from "@/lib/dicom-dvh-native";
import { safeLogLabel } from "@/lib/anonymize";
import { getVersionLine } from "@/lib/app-meta";

async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export default function DICOMUploadScreen() {
  const router = useRouter();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ name: string; uri: string }[]>([]);
  const [parsedStructures, setParsedStructures] = useState<DicomStructurePreview[]>([]);
  const [planInfo, setPlanInfo] = useState<{ dose?: number; fractions?: number }>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/dicom", "application/octet-stream", "*/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((a) => ({ name: a.name, uri: a.uri }));
        setSelectedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch {
      Alert.alert("Error", "Failed to pick files.");
    }
  };

  const handleParseDICOM = async () => {
    if (!selectedFiles.length) {
      Alert.alert("No files", "Select RTDOSE, RTSTRUCT, and/or RTPLAN .dcm files.");
      return;
    }
    setLoading(true);
    try {
      const inputs = [];
      for (const f of selectedFiles) {
        const bytes = await readFileBytes(f.uri);
        if (!isDicomBuffer(new Uint8Array(bytes))) {
          throw new Error(`${f.name} is not a DICOM file`);
        }
        inputs.push({ fileName: f.name, bytes });
      }
      const result = parseDicomDvhFiles(inputs);
      setParsedStructures(result.structures);
      setPlanInfo({
        dose: result.totalDoseGy,
        fractions: result.numFractions,
      });
      const id = await saveDvhSession(result.bundle);
      setSessionId(id);
      await savePatientCase(
        result.bundle.patientInfo?.patientId ?? "DICOM",
        "DICOM plan",
        result.bundle,
      );
      console.log(safeLogLabel("DICOM import", result.structures.length));
      Alert.alert(
        "DVH extracted",
        `${result.structures.length} structure(s) · ${result.numFractions ?? "?"} fx`,
      );
    } catch (e) {
      Alert.alert("Parse error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!sessionId) {
      Alert.alert("Parse first", "Extract DVH before continuing.");
      return;
    }
    router.push({
      pathname: "/calculation-setup",
      params: {
        dvhSessionId: sessionId,
        fileName: "DICOM import",
        totalDose: planInfo.dose ? String(Math.round(planInfo.dose)) : "60",
        numFractions: planInfo.fractions ? String(planInfo.fractions) : "30",
      },
    });
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Back</Text>
        </Pressable>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{getVersionLine()}</Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
          Import DICOM-RT
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
          Select RTDOSE (embedded DVH), RTSTRUCT (ROI names), and RTPLAN (fractions). Parsed
          on-device — PHI de-identified before storage.
        </Text>

        <Pressable
          onPress={handlePickFile}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Select DICOM file(s)</Text>
        </Pressable>

        {selectedFiles.map((f, i) => (
          <Text key={`${f.name}-${i}`} style={{ color: colors.foreground, fontSize: 13 }}>
            • {f.name}
          </Text>
        ))}

        <Pressable
          onPress={handleParseDICOM}
          disabled={loading || !selectedFiles.length}
          style={{
            backgroundColor: selectedFiles.length ? colors.success : colors.muted,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600" }}>Parse on device</Text>
          )}
        </Pressable>

        {parsedStructures.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: "600", color: colors.foreground }}>
              Structures ({parsedStructures.length})
            </Text>
            {parsedStructures.map((s) => (
              <View
                key={s.name}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>{s.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {s.type === "target" ? "Target" : "OAR"} · mean {s.meanDoseGy.toFixed(1)} Gy · max{" "}
                  {s.maxDoseGy.toFixed(1)} Gy
                </Text>
              </View>
            ))}
            <Pressable
              onPress={handleProceed}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Continue to setup</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
