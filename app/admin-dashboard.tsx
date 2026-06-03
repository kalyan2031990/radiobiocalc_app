/**
 * Institutional Admin Dashboard
 * 
 * Management interface for institutional administrators to configure protocols,
 * manage users, view compliance statistics, and monitor usage analytics
 */

import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCases: number;
  complianceScore: number;
  auditLogsCount: number;
  dataEncrypted: boolean;
  lastBackup: string;
  securityAlerts: number;
}

interface InstitutionalProtocol {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, number>;
  createdBy: string;
  createdAt: string;
  lastModified: string;
}

interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  userCount: number;
}

export default function AdminDashboard() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "protocols" | "compliance" | "security"
  >("overview");
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCases: 0,
    complianceScore: 0,
    auditLogsCount: 0,
    dataEncrypted: true,
    lastBackup: new Date().toISOString(),
    securityAlerts: 0,
  });
  const [protocols, setProtocols] = useState<InstitutionalProtocol[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<InstitutionalProtocol | null>(null);

  useEffect(() => {
    // Load admin data
    loadAdminStats();
    loadProtocols();
    loadUserRoles();
  }, []);

  const loadAdminStats = async () => {
    // Placeholder - would call API
    setStats({
      totalUsers: 45,
      activeUsers: 28,
      totalCases: 342,
      complianceScore: 94,
      auditLogsCount: 12543,
      dataEncrypted: true,
      lastBackup: new Date(Date.now() - 3600000).toISOString(),
      securityAlerts: 2,
    });
  };

  const loadProtocols = async () => {
    // Placeholder - would call API
    setProtocols([
      {
        id: "1",
        name: "QUANTEC Head & Neck",
        description: "QUANTEC guidelines for head and neck cancer",
        enabled: true,
        parameters: { alpha_beta: 10, d_50: 60 },
        createdBy: "admin@institution.edu",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastModified: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Prostate Protocol",
        description: "Institutional prostate cancer protocol",
        enabled: true,
        parameters: { alpha_beta: 1.5, d_50: 70 },
        createdBy: "admin@institution.edu",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        lastModified: new Date().toISOString(),
      },
    ]);
  };

  const loadUserRoles = async () => {
    // Placeholder - would call API
    setUserRoles([
      {
        id: "1",
        name: "Physicist",
        permissions: ["read", "write", "export", "collaborate"],
        userCount: 12,
      },
      {
        id: "2",
        name: "Oncologist",
        permissions: ["read", "collaborate"],
        userCount: 20,
      },
      {
        id: "3",
        name: "Administrator",
        permissions: ["read", "write", "delete", "admin", "audit"],
        userCount: 3,
      },
    ]);
  };

  const handleToggleProtocol = (protocolId: string) => {
    setProtocols(
      protocols.map((p) =>
        p.id === protocolId ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const handleExportAuditLog = () => {
    Alert.alert(
      "Export Audit Log",
      "Audit logs will be exported as CSV file",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Export", onPress: () => Alert.alert("Success", "Audit log exported") },
      ]
    );
  };

  const handleGenerateComplianceReport = () => {
    Alert.alert(
      "Generate Report",
      "Compliance report will be generated as PDF",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", onPress: () => Alert.alert("Success", "Report generated") },
      ]
    );
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="p-4 gap-4">
          {/* Header */}
          <View className="gap-2 mb-4">
            <Text className="text-3xl font-bold text-foreground">Admin Dashboard</Text>
            <Text className="text-sm text-muted">Institutional Management & Compliance</Text>
          </View>

          {/* Tab Navigation */}
          <View className="flex-row gap-2 mb-4">
            {(
              [
                { key: "overview", label: "Overview" },
                { key: "users", label: "Users" },
                { key: "protocols", label: "Protocols" },
                { key: "compliance", label: "Compliance" },
                { key: "security", label: "Security" },
              ] as const
            ).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-2 rounded-lg",
                  activeTab === tab.key
                    ? "bg-primary"
                    : "bg-surface border border-border"
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    activeTab === tab.key ? "text-background" : "text-foreground"
                  )}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <View className="gap-4">
              {/* Stats Grid */}
              <View className="gap-3">
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                    <Text className="text-xs text-muted mb-1">Total Users</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {stats.totalUsers}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      {stats.activeUsers} active
                    </Text>
                  </View>
                  <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                    <Text className="text-xs text-muted mb-1">Total Cases</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {stats.totalCases}
                    </Text>
                    <Text className="text-xs text-muted mt-1">This month</Text>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                    <Text className="text-xs text-muted mb-1">Compliance Score</Text>
                    <Text className="text-2xl font-bold text-success">
                      {stats.complianceScore}%
                    </Text>
                    <Text className="text-xs text-muted mt-1">HIPAA/GDPR</Text>
                  </View>
                  <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                    <Text className="text-xs text-muted mb-1">Audit Logs</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {stats.auditLogsCount}
                    </Text>
                    <Text className="text-xs text-muted mt-1">Last 90 days</Text>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View className="bg-surface rounded-lg p-4 border border-border gap-3">
                <Text className="font-semibold text-foreground">Quick Actions</Text>
                <TouchableOpacity className="bg-primary rounded-lg p-3">
                  <Text className="text-background font-semibold text-center">
                    Generate Compliance Report
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-surface border border-primary rounded-lg p-3">
                  <Text className="text-primary font-semibold text-center">
                    Export Audit Logs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <View className="gap-4">
              <Text className="font-semibold text-foreground">User Roles & Permissions</Text>
              {userRoles.map((role) => (
                <View
                  key={role.id}
                  className="bg-surface rounded-lg p-4 border border-border gap-2"
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="font-semibold text-foreground">{role.name}</Text>
                      <Text className="text-xs text-muted mt-1">
                        {role.userCount} users
                      </Text>
                    </View>
                    <TouchableOpacity className="bg-primary rounded px-3 py-1">
                      <Text className="text-xs text-background font-semibold">Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row flex-wrap gap-1 mt-2">
                    {role.permissions.map((perm) => (
                      <View
                        key={perm}
                        className="bg-primary/20 rounded px-2 py-1"
                      >
                        <Text className="text-xs text-primary font-semibold">
                          {perm}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Protocols Tab */}
          {activeTab === "protocols" && (
            <View className="gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="font-semibold text-foreground">Institutional Protocols</Text>
                <TouchableOpacity className="bg-primary rounded px-3 py-1">
                  <Text className="text-xs text-background font-semibold">+ Add</Text>
                </TouchableOpacity>
              </View>
              {protocols.map((protocol) => (
                <View
                  key={protocol.id}
                  className="bg-surface rounded-lg p-4 border border-border gap-2"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">
                        {protocol.name}
                      </Text>
                      <Text className="text-xs text-muted mt-1">
                        {protocol.description}
                      </Text>
                    </View>
                    <Switch
                      value={protocol.enabled}
                      onValueChange={() => handleToggleProtocol(protocol.id)}
                    />
                  </View>
                  <Text className="text-xs text-muted mt-2">
                    Last modified: {new Date(protocol.lastModified).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Compliance Tab */}
          {activeTab === "compliance" && (
            <View className="gap-4">
              <View className="bg-surface rounded-lg p-4 border border-border gap-3">
                <Text className="font-semibold text-foreground">Compliance Status</Text>
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">HIPAA Compliance</Text>
                    <Text className="text-sm font-semibold text-success">✓ Compliant</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">GDPR Compliance</Text>
                    <Text className="text-sm font-semibold text-success">✓ Compliant</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Data Encryption</Text>
                    <Text className="text-sm font-semibold text-success">✓ Enabled</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Audit Logging</Text>
                    <Text className="text-sm font-semibold text-success">✓ Active</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleGenerateComplianceReport}
                className="bg-primary rounded-lg p-4"
              >
                <Text className="text-background font-semibold text-center">
                  Generate Compliance Report
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <View className="gap-4">
              <View className="bg-surface rounded-lg p-4 border border-border gap-3">
                <Text className="font-semibold text-foreground">Security Status</Text>
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Data Encrypted</Text>
                    <Text className="text-sm font-semibold text-success">
                      {stats.dataEncrypted ? "✓ Yes" : "✗ No"}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Last Backup</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {new Date(stats.lastBackup).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Security Alerts</Text>
                    <Text
                      className={cn(
                        "text-sm font-semibold",
                        stats.securityAlerts > 0 ? "text-warning" : "text-success"
                      )}
                    >
                      {stats.securityAlerts}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleExportAuditLog}
                className="bg-primary rounded-lg p-4"
              >
                <Text className="text-background font-semibold text-center">
                  Export Audit Logs
                </Text>
              </TouchableOpacity>

              <View className="bg-warning/10 rounded-lg p-4 border border-warning gap-2">
                <Text className="font-semibold text-warning">Security Recommendations</Text>
                <Text className="text-xs text-muted">
                  • Enable multi-factor authentication for all administrators
                </Text>
                <Text className="text-xs text-muted">
                  • Review user access permissions quarterly
                </Text>
                <Text className="text-xs text-muted">
                  • Conduct annual security audit
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
