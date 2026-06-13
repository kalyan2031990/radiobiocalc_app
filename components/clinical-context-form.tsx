/**
 * Site- and organ-specific optional clinical fields (dropdown-first).
 * TCP targets and NTCP OARs share patient/disease/treatment sections;
 * structure-specific fields filter by role + literature organ.
 */

import type { ReactNode } from "react";
import { Text, View, TextInput, Pressable, ScrollView, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import type { ClinicalContext, StructureRole } from "@/lib/clinical-context";
import {
  getClinicalFieldsForContext,
  groupClinicalFields,
  SECTION_LABELS,
  clinicalContextHasValues,
  defaultNtcpEndpointForOrgan,
  type ClinicalFieldDefinition,
} from "@/lib/clinical-fields-schema";

type Colors = {
  foreground: string;
  muted: string;
  surface: string;
  border: string;
  primary: string;
};

type Props = {
  value: ClinicalContext;
  onChange: (next: ClinicalContext) => void;
  cancerSite: string;
  structureType: StructureRole;
  organ: string;
  colors: Colors;
};

function Field({
  label,
  children,
  colors,
}: {
  label: string;
  children: ReactNode;
  colors: Colors;
}) {
  return (
    <View className="gap-1">
      <Text className="text-sm" style={{ color: colors.muted }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const inputStyle = (colors: Colors) => ({
  backgroundColor: colors.surface,
  color: colors.foreground,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
});

function SelectField({
  field,
  value,
  onSelect,
  colors,
}: {
  field: ClinicalFieldDefinition;
  value: string;
  onSelect: (v: string) => void;
  colors: Colors;
}) {
  const [open, setOpen] = useState(false);
  const options = field.options ?? [];

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <View
          className="flex-row justify-between items-center rounded-lg px-3 py-3"
          style={{ ...inputStyle(colors), paddingVertical: 12 }}
        >
          <Text style={{ color: value ? colors.foreground : colors.muted }}>
            {value || "Select…"}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={colors.muted} />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="slide">
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={() => setOpen(false)}
        >
          <View
            className="rounded-t-2xl max-h-96"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="p-4 border-b" style={{ borderColor: colors.border }}>
              <Text className="font-semibold text-base" style={{ color: colors.foreground }}>
                {field.label}
              </Text>
            </View>
            <ScrollView>
              <Pressable onPress={() => { onSelect(""); setOpen(false); }}>
                <Text className="p-4 italic" style={{ color: colors.muted }}>
                  Clear selection
                </Text>
              </Pressable>
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                >
                  <View
                    className="px-4 py-3 border-b flex-row justify-between"
                    style={{ borderColor: colors.border }}
                  >
                    <Text style={{ color: colors.foreground }}>{opt}</Text>
                    {value === opt && (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function ClinicalContextForm({
  value,
  onChange,
  cancerSite,
  structureType,
  organ,
  colors,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const fields = useMemo(
    () => getClinicalFieldsForContext(cancerSite, structureType, organ),
    [cancerSite, structureType, organ]
  );
  const grouped = useMemo(() => groupClinicalFields(fields), [fields]);

  const setField = (id: string, v: string) => {
    onChange({ ...value, [id]: v });
  };

  useEffect(() => {
    // Preset defaults when organ/role changes (user can clear via dropdown)
    if (structureType !== "oar" || value.ntcp_endpoint) return;
    const def = defaultNtcpEndpointForOrgan(organ);
    if (def !== "Generic QUANTEC") {
      onChange({ ...value, ntcp_endpoint: def });
    }
  }, [structureType, organ, value.ntcp_endpoint]);

  useEffect(() => {
    if (structureType !== "target" || value.target_type) return;
    const t = /gtv/i.test(organ)
      ? "GTV"
      : /ctv/i.test(organ)
        ? "CTV"
        : /itv/i.test(organ)
          ? "ITV"
          : "PTV";
    onChange({ ...value, target_type: t });
  }, [structureType, organ, value.target_type]);

  const roleLabel = structureType === "target" ? "TCP / target" : "NTCP / OAR";
  const hasAny = clinicalContextHasValues(value);

  const renderField = (field: ClinicalFieldDefinition) => {
    const val = value[field.id] ?? "";
    if (field.type === "select") {
      return (
        <SelectField
          key={field.id}
          field={field}
          value={val}
          onSelect={(v) => setField(field.id, v)}
          colors={colors}
        />
      );
    }
    if (field.type === "multiline") {
      return (
        <TextInput
          key={field.id}
          value={val}
          onChangeText={(t) => setField(field.id, t)}
          placeholder={field.placeholder}
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
          style={[inputStyle(colors), { minHeight: 72, textAlignVertical: "top" }]}
        />
      );
    }
    return (
      <TextInput
        key={field.id}
        value={val}
        onChangeText={(t) => setField(field.id, t)}
        placeholder={field.placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={field.id === "age" ? "number-pad" : "default"}
        style={inputStyle(colors)}
      />
    );
  };

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        <View
          className="flex-row items-center justify-between rounded-lg p-3"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center gap-2 flex-1">
            <MaterialIcons name="medical-information" size={22} color={colors.primary} />
            <View className="flex-1">
              <Text className="font-semibold" style={{ color: colors.foreground }}>
                Clinical context (optional)
              </Text>
              <Text className="text-xs" style={{ color: colors.muted }}>
                {roleLabel} · {organ} — {fields.length} fields available
                {hasAny ? " · adjusts TCP/NTCP" : ""}
              </Text>
            </View>
          </View>
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={24}
            color={colors.muted}
          />
        </View>
      </Pressable>

      {expanded && (
        <View
          className="gap-4 p-3 rounded-lg"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          {Object.entries(grouped).map(([section, sectionFields]) => (
            <View key={section} className="gap-3">
              <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                {SECTION_LABELS[section] ?? section}
              </Text>
              {sectionFields.map((field) => (
                <Field key={field.id} label={field.label} colors={colors}>
                  {renderField(field)}
                </Field>
              ))}
            </View>
          ))}

          <Text className="text-xs italic" style={{ color: colors.muted }}>
            Dropdowns are site- and organ-specific for {roleLabel}. Advisory only — not fed into
            TCP/NTCP formulas on mobile.
          </Text>
        </View>
      )}
    </View>
  );
}
