// Notification Service — Event-driven, pluggable transport
// In-app notifications via Supabase. Email transport pluggable:
// - Development: console.log
// - Production: Azure Communication Services or SendGrid
//
// To swap email provider, implement EmailTransport interface and
// update the createNotificationService factory.

import { logger } from '@/lib/logger';

// === Types ===

export type NotificationType =
  | 'deal_submitted'
  | 'deal_approved'
  | 'deal_kicked_back'
  | 'action_required'
  | 'deal_completed'
  | 'deal_assigned'
  | 'timer_warning'
  | 'timer_overdue';

export interface NotificationPayload {
  type: NotificationType;
  dealId: string;
  dealNumber: string;
  recipientId: string;
  recipientEmail?: string;
  metadata?: Record<string, string>;
}

export interface NotificationConfig {
  enabled: boolean;
  email_notifications: boolean;
  timer_alerts: boolean;
}

// === Email Transport Interface (for Azure migration) ===

export interface EmailTransport {
  send(
    to: string,
    subject: string,
    htmlBody: string
  ): Promise<{ success: boolean; error?: string }>;
}

// Console transport for development
class ConsoleEmailTransport implements EmailTransport {
  async send(to: string, subject: string, _htmlBody: string) {
    logger.info('Email notification (dev mode)', {
      component: 'notifications',
      action: 'send_email',
      recipient: to,
      subject,
    });
    return { success: true };
  }
}

// === Notification Templates ===

const TEMPLATES: Record<
  NotificationType,
  { subject: string; body: (meta: Record<string, string>) => string }
> = {
  deal_submitted: {
    subject: 'New Deal Submitted: {dealNumber}',
    body: (m) =>
      `A new deal ${m.dealNumber || ''} has been submitted for your review.`,
  },
  deal_approved: {
    subject: 'Deal Approved: {dealNumber}',
    body: (m) =>
      `Deal ${m.dealNumber || ''} has been approved and sent to underwriting.`,
  },
  deal_kicked_back: {
    subject: 'Deal Requires Changes: {dealNumber}',
    body: (m) =>
      `Deal ${m.dealNumber || ''} has been kicked back. ${m.reason || 'Please review and resubmit.'}`,
  },
  action_required: {
    subject: 'Response Requested on Deal: {dealNumber}',
    body: (m) =>
      `A response has been requested on deal ${m.dealNumber || ''}. ${m.message || ''}`,
  },
  deal_completed: {
    subject: 'Deal Completed: {dealNumber}',
    body: (m) =>
      `Deal ${m.dealNumber || ''} has been marked as completed.`,
  },
  deal_assigned: {
    subject: 'Deal Assigned to You: {dealNumber}',
    body: (m) =>
      `Deal ${m.dealNumber || ''} has been assigned to you for underwriting review.`,
  },
  timer_warning: {
    subject: 'SLA Warning: {dealNumber}',
    body: (m) =>
      `Deal ${m.dealNumber || ''} is approaching the SLA threshold. Please take action.`,
  },
  timer_overdue: {
    subject: 'SLA Overdue: {dealNumber}',
    body: (m) =>
      `Deal ${m.dealNumber || ''} has exceeded the SLA threshold and requires immediate attention.`,
  },
};

function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
}

// === Notification Service ===

export interface NotificationServiceInterface {
  sendEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; error: string | null }>;
  sendDealNotification(
    dealId: string,
    recipientId: string,
    type: NotificationType
  ): Promise<void>;
  notify(payload: NotificationPayload): Promise<void>;
}

export class NotificationService implements NotificationServiceInterface {
  constructor(private readonly emailTransport: EmailTransport) {}

  async sendEmail(to: string, subject: string, body: string) {
    try {
      const result = await this.emailTransport.send(to, subject, body);
      return { success: result.success, error: result.error || null };
    } catch (err) {
      logger.error(
        'Failed to send email',
        err instanceof Error ? err : new Error(String(err)),
        { component: 'notifications' }
      );
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async sendDealNotification(
    dealId: string,
    recipientId: string,
    type: NotificationType
  ) {
    logger.info(`Deal notification: ${type}`, {
      component: 'notifications',
      dealId,
      userId: recipientId,
      action: type,
    });
  }

  async notify(payload: NotificationPayload): Promise<void> {
    const {
      type,
      dealId,
      dealNumber,
      recipientId,
      recipientEmail,
      metadata = {},
    } = payload;
    const template = TEMPLATES[type];

    if (!template) {
      logger.warn('Unknown notification type', {
        component: 'notifications',
        action: type,
      });
      return;
    }

    const vars = { dealNumber, dealId, ...metadata };

    // 1. Log the in-app notification
    // Note: When Supabase notifications table is added, store here
    logger.info('In-app notification created', {
      component: 'notifications',
      dealId,
      userId: recipientId,
      action: type,
    });

    // 2. Send email if recipient has an email
    if (recipientEmail) {
      try {
        const subject = renderTemplate(template.subject, vars);
        const body = template.body(vars);
        await this.emailTransport.send(recipientEmail, subject, body);
      } catch (err) {
        logger.error(
          'Failed to send email notification',
          err instanceof Error ? err : new Error(String(err)),
          {
            component: 'notifications',
            dealId,
            userId: recipientId,
            action: type,
          }
        );
      }
    }
  }
}

// === Factory ===
// Swap transport here when migrating to Azure Communication Services

export function createNotificationService(): NotificationServiceInterface {
  const transport = new ConsoleEmailTransport();
  // Production example:
  //   const transport = new AzureCommunicationEmailTransport(connectionString);
  //   const transport = new SendGridTransport(apiKey);
  return new NotificationService(transport);
}

export const notificationService = createNotificationService();
