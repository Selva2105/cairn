import { describe, expect, it } from 'vitest';

import { buildWhatsAppMessagePayload } from './whatsapp-payload.builder';

describe('buildWhatsAppMessagePayload', () => {
  it('builds standard text payload when no interactive metadata is provided', () => {
    const payload = buildWhatsAppMessagePayload(
      {
        to: '+916369293685',
        subject: 'Cairn',
        body: 'Hello world',
      },
      'Hello world',
    );

    expect(payload).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+916369293685',
      type: 'text',
      text: {
        body: 'Hello world',
      },
    });
  });

  it('builds interactive button payload with clamped titles and max 3 buttons', () => {
    const payload = buildWhatsAppMessagePayload(
      {
        to: '+916369293685',
        subject: 'Cairn',
        body: 'Choose an option',
        interactive: {
          type: 'button',
          buttons: [
            { id: 'ACTION_ADD_BILL', title: 'Add Bill' },
            { id: 'ACTION_ADD_TASK', title: 'Add Task' },
            { id: 'ACTION_STATUS', title: 'Status' },
            { id: 'ACTION_EXTRA', title: 'Ignored extra button' },
          ],
        },
      },
      'Choose an option',
    );

    expect(payload).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+916369293685',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: 'Choose an option',
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: { id: 'ACTION_ADD_BILL', title: 'Add Bill' },
            },
            {
              type: 'reply',
              reply: { id: 'ACTION_ADD_TASK', title: 'Add Task' },
            },
            { type: 'reply', reply: { id: 'ACTION_STATUS', title: 'Status' } },
          ],
        },
      },
    });
  });

  it('builds interactive list payload with sections and rows', () => {
    const payload = buildWhatsAppMessagePayload(
      {
        to: '+916369293685',
        subject: 'Cairn',
        body: 'Select an action',
        interactive: {
          type: 'list',
          buttonText: 'View Options',
          sections: [
            {
              title: 'Actions',
              rows: [
                {
                  id: 'ROW_1',
                  title: 'Add Bill',
                  description: 'Log a new household bill',
                },
                {
                  id: 'ROW_2',
                  title: 'Add Task',
                  description: 'Create a household chore',
                },
              ],
            },
          ],
        },
      },
      'Select an action',
    );

    expect(payload).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+916369293685',
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: 'Select an action',
        },
        action: {
          button: 'View Options',
          sections: [
            {
              title: 'Actions',
              rows: [
                {
                  id: 'ROW_1',
                  title: 'Add Bill',
                  description: 'Log a new household bill',
                },
                {
                  id: 'ROW_2',
                  title: 'Add Task',
                  description: 'Create a household chore',
                },
              ],
            },
          ],
        },
      },
    });
  });
});
