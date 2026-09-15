import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.configService.get(key, { infer: true });
  }
}
