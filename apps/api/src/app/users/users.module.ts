import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CairnAuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
