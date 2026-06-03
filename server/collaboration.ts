/**
 * Real-Time Collaboration Service
 * 
 * Handles multi-user editing, presence tracking, and conflict resolution
 * for collaborative radiobiology case analysis
 */

import { z } from "zod";

export const UserPresenceSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userRole: z.enum(["physicist", "oncologist", "dosimetrist", "admin"]),
  caseId: z.string(),
  lastActive: z.string().datetime(),
  isOnline: z.boolean(),
  cursorPosition: z.object({
    screen: z.string(),
    field: z.string().optional(),
  }).optional(),
  color: z.string(), // For visual identification
});

export const CollaborationEventSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  userId: z.string(),
  eventType: z.enum([
    "case_opened",
    "calculation_updated",
    "parameter_changed",
    "comment_added",
    "case_closed",
  ]),
  timestamp: z.string().datetime(),
  data: z.record(z.string(), z.any()),
  affectedFields: z.array(z.string()).default([]),
});

export const CollaborationCommentSchema: z.ZodType<any> = z.object({
  id: z.string().uuid(),
  caseId: z.string(),
  userId: z.string(),
  userName: z.string(),
  content: z.string(),
  timestamp: z.string().datetime(),
  resolved: z.boolean().default(false),
  replies: z.array(z.lazy(() => CollaborationCommentSchema)).optional(),
});

export type UserPresence = z.infer<typeof UserPresenceSchema>;
export type CollaborationEvent = z.infer<typeof CollaborationEventSchema>;
export interface CollaborationComment {
  id: string;
  caseId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  resolved: boolean;
  replies?: CollaborationComment[];
}

/**
 * Real-Time Collaboration Service
 */
export class CollaborationService {
  private static activeUsers: Map<string, UserPresence> = new Map();
  private static collaborationEvents: CollaborationEvent[] = [];
  private static comments: CollaborationComment[] = [];

  /**
   * User joins a case for collaboration
   */
  static async userJoinCase(
    userId: string,
    userName: string,
    userRole: string,
    caseId: string
  ): Promise<UserPresence> {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const presence: UserPresence = {
      userId,
      userName,
      userRole: userRole as any,
      caseId,
      lastActive: new Date().toISOString(),
      isOnline: true,
      color,
    };

    const key = `${caseId}:${userId}`;
    this.activeUsers.set(key, presence);

    // Log collaboration event
    await this.logEvent(caseId, userId, "case_opened", {
      userName,
      userRole,
    });

    return presence;
  }

  /**
   * User leaves a case
   */
  static async userLeaveCase(
    userId: string,
    caseId: string
  ): Promise<boolean> {
    const key = `${caseId}:${userId}`;
    const presence = this.activeUsers.get(key);

    if (presence) {
      await this.logEvent(caseId, userId, "case_closed", {
        userName: presence.userName,
      });
      this.activeUsers.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Get all active users in a case
   */
  static getActiveCaseUsers(caseId: string): UserPresence[] {
    const users: UserPresence[] = [];

    for (const [key, presence] of this.activeUsers) {
      if (key.startsWith(`${caseId}:`)) {
        users.push(presence);
      }
    }

    return users;
  }

  /**
   * Update user cursor position for live editing feedback
   */
  static updateUserCursor(
    userId: string,
    caseId: string,
    screen: string,
    field?: string
  ): boolean {
    const key = `${caseId}:${userId}`;
    const presence = this.activeUsers.get(key);

    if (presence) {
      presence.cursorPosition = { screen, field };
      presence.lastActive = new Date().toISOString();
      return true;
    }

    return false;
  }

  /**
   * Log collaboration event
   */
  static async logEvent(
    caseId: string,
    userId: string,
    eventType: string,
    data: any,
    affectedFields: string[] = []
  ): Promise<CollaborationEvent> {
    const event: CollaborationEvent = {
      id: Math.random().toString(36).substring(2, 11),
      caseId,
      userId,
      eventType: eventType as any,
      timestamp: new Date().toISOString(),
      data,
      affectedFields,
    };

    this.collaborationEvents.push(event);

    // Keep only last 1000 events per case
    const caseEvents = this.collaborationEvents.filter(
      (e) => e.caseId === caseId
    );
    if (caseEvents.length > 1000) {
      this.collaborationEvents = this.collaborationEvents.filter(
        (e) => e.caseId !== caseId || caseEvents.indexOf(e) >= caseEvents.length - 1000
      );
    }

    return event;
  }

  /**
   * Get collaboration history for a case
   */
  static getCaseHistory(caseId: string, limit: number = 50): CollaborationEvent[] {
    return this.collaborationEvents
      .filter((e) => e.caseId === caseId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Add comment to case
   */
  static async addComment(
    caseId: string,
    userId: string,
    userName: string,
    content: string
  ): Promise<CollaborationComment> {
    const comment: CollaborationComment = {
      id: Math.random().toString(36).substring(2, 11),
      caseId,
      userId,
      userName,
      content,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.comments.push(comment);

    await this.logEvent(caseId, userId, "comment_added", {
      commentId: comment.id,
      content,
    });

    return comment;
  }

  /**
   * Reply to comment
   */
  static async replyToComment(
    caseId: string,
    commentId: string,
    userId: string,
    userName: string,
    content: string
  ): Promise<CollaborationComment | null> {
    const comment = this.comments.find((c) => c.id === commentId);

    if (!comment) return null;

    const reply: CollaborationComment = {
      id: Math.random().toString(36).substring(2, 11),
      caseId,
      userId,
      userName,
      content,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    if (!comment.replies) {
      comment.replies = [];
    }

    comment.replies.push(reply);

    await this.logEvent(caseId, userId, "comment_added", {
      parentCommentId: commentId,
      content,
    });

    return reply;
  }

  /**
   * Get all comments for a case
   */
  static getCaseComments(caseId: string): CollaborationComment[] {
    return this.comments.filter((c) => c.caseId === caseId);
  }

  /**
   * Resolve comment
   */
  static resolveComment(commentId: string): boolean {
    const comment = this.comments.find((c) => c.id === commentId);

    if (comment) {
      comment.resolved = true;
      return true;
    }

    return false;
  }

  /**
   * Check for concurrent edits (conflict detection)
   */
  static checkConflict(
    caseId: string,
    userId: string,
    field: string,
    lastModifiedTime: string
  ): { hasConflict: boolean; conflictingUser?: string } {
    const events = this.collaborationEvents.filter(
      (e) =>
        e.caseId === caseId &&
        e.userId !== userId &&
        e.affectedFields.includes(field) &&
        new Date(e.timestamp) > new Date(lastModifiedTime)
    );

    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      const conflictingUser = this.activeUsers.get(
        `${caseId}:${lastEvent.userId}`
      )?.userName;

      return {
        hasConflict: true,
        conflictingUser,
      };
    }

    return { hasConflict: false };
  }

  /**
   * Get collaboration statistics for a case
   */
  static getCaseStats(caseId: string): {
    totalEvents: number;
    activeUsers: number;
    totalComments: number;
    unresolvedComments: number;
  } {
    const events = this.collaborationEvents.filter((e) => e.caseId === caseId);
    const users = this.getActiveCaseUsers(caseId);
    const comments = this.getCaseComments(caseId);
    const unresolvedComments = comments.filter((c) => !c.resolved).length;

    return {
      totalEvents: events.length,
      activeUsers: users.length,
      totalComments: comments.length,
      unresolvedComments,
    };
  }
}
