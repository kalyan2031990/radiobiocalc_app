/**
 * Ethical Protocols & IRB Compliance Framework
 * 
 * Institutional Review Board (IRB) compliance, informed consent,
 * and ethical guidelines for clinical research and deployment
 */

import { z } from "zod";

export const IRBProtocolSchema = z.object({
  id: z.string(),
  protocolNumber: z.string(),
  title: z.string(),
  principalInvestigator: z.string(),
  institution: z.string(),
  irbApprovalDate: z.string().datetime(),
  irbExpirationDate: z.string().datetime(),
  protocolStatus: z.enum([
    "approved",
    "pending_review",
    "conditional_approval",
    "expired",
    "withdrawn",
  ]),
  riskLevel: z.enum(["minimal", "low", "moderate", "high"]),
  studyType: z.enum([
    "validation_study",
    "clinical_trial",
    "observational_study",
    "software_evaluation",
  ]),
  objectives: z.array(z.string()),
  methodology: z.string(),
  inclusionCriteria: z.array(z.string()),
  exclusionCriteria: z.array(z.string()),
  targetPopulation: z.string(),
  expectedParticipants: z.number(),
  dataHandlingPlan: z.string(),
  riskMitigationStrategies: z.array(z.string()),
  ethicalConsiderations: z.array(z.string()),
  references: z.array(z.string()),
});

export const InformedConsentSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  version: z.string(),
  effectiveDate: z.string().datetime(),
  language: z.string(),
  content: z.string(),
  keyPoints: z.array(z.string()),
  riskDisclosure: z.array(z.string()),
  benefitDisclosure: z.array(z.string()),
  voluntaryParticipationStatement: z.string(),
  confidentialityStatement: z.string(),
  contactInformation: z.object({
    principalInvestigator: z.string(),
    irbContact: z.string(),
    emergencyContact: z.string(),
  }),
});

export const ParticipantConsentSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  participantId: z.string(),
  consentDate: z.string().datetime(),
  consentFormVersion: z.string(),
  consentedBy: z.string(), // Participant or legal guardian
  witnessedBy: z.string().optional(),
  understandsRisks: z.boolean(),
  understandsBenefits: z.boolean(),
  understandsVoluntary: z.boolean(),
  understandsConfidentiality: z.boolean(),
  agreeToDataSharing: z.boolean().optional(),
  agreeToFutureContact: z.boolean().optional(),
  withdrawalDate: z.string().datetime().optional(),
  withdrawalReason: z.string().optional(),
});

export const EthicalReviewSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  reviewDate: z.string().datetime(),
  reviewType: z.enum([
    "initial_review",
    "continuing_review",
    "amendment_review",
    "adverse_event_review",
  ]),
  reviewerName: z.string(),
  reviewerRole: z.string(),
  findings: z.array(z.string()),
  recommendations: z.array(z.string()),
  decision: z.enum(["approved", "conditional_approval", "not_approved"]),
  conditionsForApproval: z.array(z.string()).optional(),
  nextReviewDate: z.string().datetime().optional(),
});

export const AdverseEventSchema = z.object({
  id: z.string(),
  protocolId: z.string(),
  participantId: z.string(),
  eventDate: z.string().datetime(),
  eventDescription: z.string(),
  severity: z.enum(["mild", "moderate", "severe", "life_threatening"]),
  relatedness: z.enum(["unrelated", "unlikely", "possibly", "probably", "definitely"]),
  reportedDate: z.string().datetime(),
  reportedBy: z.string(),
  actionTaken: z.string(),
  outcome: z.enum(["recovered", "recovering", "not_recovered", "fatal", "unknown"]),
  irbNotified: z.boolean(),
  irbNotificationDate: z.string().datetime().optional(),
});

export type IRBProtocol = z.infer<typeof IRBProtocolSchema>;
export type InformedConsent = z.infer<typeof InformedConsentSchema>;
export type ParticipantConsent = z.infer<typeof ParticipantConsentSchema>;
export type EthicalReview = z.infer<typeof EthicalReviewSchema>;
export type AdverseEvent = z.infer<typeof AdverseEventSchema>;

/**
 * Ethical Protocols & IRB Compliance Service
 */
export class EthicalProtocolsService {
  private static irbProtocols: IRBProtocol[] = [];
  private static informedConsents: InformedConsent[] = [];
  private static participantConsents: ParticipantConsent[] = [];
  private static ethicalReviews: EthicalReview[] = [];
  private static adverseEvents: AdverseEvent[] = [];

  /**
   * Register IRB protocol
   */
  static async registerIRBProtocol(protocol: IRBProtocol): Promise<IRBProtocol> {
    this.irbProtocols.push(protocol);
    return protocol;
  }

  /**
   * Get IRB protocol
   */
  static getIRBProtocol(protocolId: string): IRBProtocol | null {
    return this.irbProtocols.find((p) => p.id === protocolId) || null;
  }

  /**
   * Check if protocol is currently approved
   */
  static isProtocolApproved(protocolId: string): boolean {
    const protocol = this.getIRBProtocol(protocolId);

    if (!protocol) return false;

    const now = new Date();
    const expirationDate = new Date(protocol.irbExpirationDate);

    return (
      protocol.protocolStatus === "approved" &&
      expirationDate > now
    );
  }

  /**
   * Register informed consent form
   */
  static async registerInformedConsent(
    consent: InformedConsent
  ): Promise<InformedConsent> {
    this.informedConsents.push(consent);
    return consent;
  }

  /**
   * Get informed consent form
   */
  static getInformedConsent(consentId: string): InformedConsent | null {
    return this.informedConsents.find((c) => c.id === consentId) || null;
  }

  /**
   * Record participant consent
   */
  static async recordParticipantConsent(
    consent: ParticipantConsent
  ): Promise<ParticipantConsent> {
    this.participantConsents.push(consent);
    return consent;
  }

  /**
   * Check if participant has valid consent
   */
  static hasValidConsent(
    protocolId: string,
    participantId: string
  ): boolean {
    const consent = this.participantConsents.find(
      (c) =>
        c.protocolId === protocolId &&
        c.participantId === participantId &&
        !c.withdrawalDate
    );

    return !!consent;
  }

  /**
   * Withdraw participant consent
   */
  static async withdrawConsent(
    consentId: string,
    reason: string
  ): Promise<boolean> {
    const consent = this.participantConsents.find((c) => c.id === consentId);

    if (consent) {
      consent.withdrawalDate = new Date().toISOString();
      consent.withdrawalReason = reason;
      return true;
    }

    return false;
  }

  /**
   * Record ethical review
   */
  static async recordEthicalReview(
    review: EthicalReview
  ): Promise<EthicalReview> {
    this.ethicalReviews.push(review);

    // Update protocol status based on review decision
    const protocol = this.getIRBProtocol(review.protocolId);
    if (protocol) {
      if (review.decision === "approved") {
        protocol.protocolStatus = "approved";
      } else if (review.decision === "conditional_approval") {
        protocol.protocolStatus = "conditional_approval";
      } else if (review.decision === "not_approved") {
        protocol.protocolStatus = "pending_review";
      }
    }

    return review;
  }

  /**
   * Get ethical reviews for protocol
   */
  static getEthicalReviews(protocolId: string): EthicalReview[] {
    return this.ethicalReviews.filter((r) => r.protocolId === protocolId);
  }

  /**
   * Report adverse event
   */
  static async reportAdverseEvent(
    event: AdverseEvent
  ): Promise<AdverseEvent> {
    this.adverseEvents.push(event);

    // Auto-notify IRB for severe events
    if (event.severity === "severe" || event.severity === "life_threatening") {
      event.irbNotified = true;
      event.irbNotificationDate = new Date().toISOString();
    }

    return event;
  }

  /**
   * Get adverse events for protocol
   */
  static getAdverseEvents(protocolId: string): AdverseEvent[] {
    return this.adverseEvents.filter((e) => e.protocolId === protocolId);
  }

  /**
   * Get unresolved adverse events
   */
  static getUnresolvedAdverseEvents(): AdverseEvent[] {
    return this.adverseEvents.filter(
      (e) => e.outcome === "unknown" || e.outcome === "not_recovered"
    );
  }

  /**
   * Generate ethical compliance report
   */
  static generateEthicalComplianceReport(protocolId: string): {
    protocolId: string;
    isApproved: boolean;
    consentRecords: number;
    validConsents: number;
    adverseEvents: number;
    severeAdverseEvents: number;
    irbNotifiedEvents: number;
    complianceStatus: "compliant" | "non_compliant" | "requires_review";
    recommendations: string[];
  } {
    const protocol = this.getIRBProtocol(protocolId);
    const consents = this.participantConsents.filter(
      (c) => c.protocolId === protocolId
    );
    const validConsents = consents.filter((c) => !c.withdrawalDate).length;
    const events = this.getAdverseEvents(protocolId);
    const severeEvents = events.filter(
      (e) => e.severity === "severe" || e.severity === "life_threatening"
    ).length;
    const notifiedEvents = events.filter((e) => e.irbNotified).length;

    const recommendations: string[] = [];

    if (!protocol || !this.isProtocolApproved(protocolId)) {
      recommendations.push("Protocol approval status needs to be verified");
    }

    if (validConsents < consents.length * 0.9) {
      recommendations.push("High rate of consent withdrawals - review protocol");
    }

    if (severeEvents > 0 && notifiedEvents < severeEvents) {
      recommendations.push("Not all severe adverse events have been reported to IRB");
    }

    const complianceStatus =
      recommendations.length === 0
        ? "compliant"
        : recommendations.length <= 2
          ? "requires_review"
          : "non_compliant";

    return {
      protocolId,
      isApproved: protocol ? this.isProtocolApproved(protocolId) : false,
      consentRecords: consents.length,
      validConsents,
      adverseEvents: events.length,
      severeAdverseEvents: severeEvents,
      irbNotifiedEvents: notifiedEvents,
      complianceStatus,
      recommendations,
    };
  }

  /**
   * Get all IRB protocols
   */
  static getAllIRBProtocols(): IRBProtocol[] {
    return this.irbProtocols;
  }

  /**
   * Get approved protocols
   */
  static getApprovedProtocols(): IRBProtocol[] {
    return this.irbProtocols.filter((p) => this.isProtocolApproved(p.id));
  }
}
