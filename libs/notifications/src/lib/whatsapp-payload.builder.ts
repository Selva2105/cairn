import type { NotificationPayload } from './notification-channel.interface';

export function buildWhatsAppMessagePayload(
  payload: NotificationPayload,
  formattedBody: string,
): Record<string, unknown> {
  const interactive = payload.interactive;

  if (
    interactive?.type === 'button' &&
    interactive.buttons &&
    interactive.buttons.length > 0
  ) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: formattedBody,
        },
        action: {
          buttons: interactive.buttons.slice(0, 3).map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20),
            },
          })),
        },
      },
    };
  }

  if (
    interactive?.type === 'list' &&
    interactive.sections &&
    interactive.sections.length > 0
  ) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: formattedBody,
        },
        action: {
          button: (interactive.buttonText ?? 'Choose Option').slice(0, 20),
          sections: interactive.sections.map((section) => ({
            title: section.title.slice(0, 24),
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title.slice(0, 24),
              ...(row.description
                ? { description: row.description.slice(0, 72) }
                : {}),
            })),
          })),
        },
      },
    };
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: payload.to,
    type: 'text',
    text: {
      body: formattedBody,
    },
  };
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}
