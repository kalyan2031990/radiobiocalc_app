import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";

const DISCLAIMER_KEY = "@rbgyanx_disclaimer_accepted";

export function ClinicalDisclaimerModal() {
  const [visible, setVisible] = useState(false);
  const colors = useColors();

  useEffect(() => {
    checkDisclaimerStatus();
  }, []);

  const checkDisclaimerStatus = async () => {
    try {
      const accepted = await AsyncStorage.getItem(DISCLAIMER_KEY);
      if (!accepted) {
        setVisible(true);
      }
    } catch (error) {
      console.error("Error checking disclaimer status:", error);
      setVisible(true); // Show disclaimer on error to be safe
    }
  };

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_KEY, "true");
      setVisible(false);
    } catch (error) {
      console.error("Error saving disclaimer acceptance:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        // Prevent closing without accepting
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            padding: 24,
            maxWidth: 600,
            width: "100%",
            maxHeight: "80%",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={true}>
            {/* Title */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: colors.foreground,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              ⚕️ Clinical Decision Support System
            </Text>

            {/* Important Notice Header */}
            <View
              style={{
                backgroundColor: "#FEF3C7",
                borderLeftWidth: 4,
                borderLeftColor: "#F59E0B",
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#92400E",
                  marginBottom: 4,
                }}
              >
                ⚠️ IMPORTANT NOTICE
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#92400E",
                  lineHeight: 20,
                }}
              >
                Please read and understand this disclaimer before using the app.
              </Text>
            </View>

            {/* Main Disclaimer Text */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: colors.foreground,
                  marginBottom: 12,
                }}
              >
                Clinical Decision Support Framework
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                This application is a <Text style={{ fontWeight: "bold" }}>knowledge-guided clinical decision support system (CDSS) framework</Text> designed to assist healthcare professionals in radiation oncology treatment planning and outcome evaluation.
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#DC2626",
                  marginBottom: 12,
                }}
              >
                No Autonomous Decisions
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                This app <Text style={{ fontWeight: "bold" }}>DOES NOT make autonomous clinical decisions</Text>. All calculations, recommendations, and outputs are <Text style={{ fontWeight: "bold" }}>advisory only</Text> and must be carefully reviewed by qualified human experts before implementation.
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: colors.foreground,
                  marginBottom: 12,
                }}
              >
                Clinical Responsibility
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontWeight: "bold" }}>Clinical decisions are the sole responsibility of licensed clinicians</Text> (radiation oncologists, medical physicists, and dosimetrists). This tool provides computational support based on published radiobiological models and clinical protocols, but final treatment decisions must be made by qualified healthcare professionals.
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: colors.foreground,
                  marginBottom: 12,
                }}
              >
                Expert Review Required
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                All app outputs, including TCP/NTCP calculations, dose-response curves, therapeutic window analyses, and treatment recommendations, <Text style={{ fontWeight: "bold" }}>must be carefully reviewed and validated by human experts</Text> before clinical implementation.
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: colors.foreground,
                  marginBottom: 12,
                }}
              >
                Intended Use
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                This app is intended for use by qualified healthcare professionals in radiation oncology for:
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 22,
                  marginLeft: 16,
                  marginBottom: 16,
                }}
              >
                • Treatment plan evaluation and comparison{"\n"}
                • Radiobiological modeling and outcome prediction{"\n"}
                • Quality assurance and protocol compliance{"\n"}
                • Clinical research and education{"\n"}
                • Single-patient and cohort analysis
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: colors.foreground,
                  marginBottom: 12,
                }}
              >
                Limitations
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                Radiobiological models are simplifications of complex biological processes. Model predictions have inherent uncertainties and should be interpreted with clinical judgment and institutional experience.
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: colors.foreground,
                  marginBottom: 12,
                }}
              >
                Privacy & Security
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                This app operates <Text style={{ fontWeight: "bold" }}>offline-first</Text> with <Text style={{ fontWeight: "bold" }}>local-only data storage</Text>. No patient data is automatically transmitted to external servers. No tracking or analytics are performed. User privacy and data security are paramount.
              </Text>
            </View>

            {/* Acceptance Checkbox */}
            <View
              style={{
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.foreground,
                  lineHeight: 20,
                  textAlign: "center",
                }}
              >
                By clicking "I Understand and Accept", you acknowledge that you have read and understood this disclaimer and agree to use this app in accordance with these terms.
              </Text>
            </View>

            {/* Accept Button */}
            <TouchableOpacity
              onPress={handleAccept}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 12,
                alignItems: "center",
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                I Understand and Accept
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
