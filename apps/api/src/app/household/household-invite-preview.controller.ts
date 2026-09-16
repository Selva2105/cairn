import { Controller, Get, Param } from '@nestjs/common';
import { API_ROUTES } from '@cairn/shared-constants';

import { HouseholdService } from './household.service';

/**
 * Deliberately un-guarded (no JwtAuthGuard) -- an invitee needs to see which household they're
 * being asked to join before they've signed up at all. The token itself is the credential; this
 * only ever reveals a household name, never membership/document data.
 */
@Controller()
export class HouseholdInvitePreviewController {
  constructor(private readonly householdService: HouseholdService) {}

  @Get(API_ROUTES.HOUSEHOLDS.INVITE_PREVIEW(':token'))
  preview(@Param('token') token: string): Promise<{ householdName: string }> {
    return this.householdService.previewInvite(token);
  }
}
