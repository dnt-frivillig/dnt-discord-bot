import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { CabinDatabaseApi } from './cabinDatabase.api';
import { CabinSummary } from './cabinDatabase.interface';
import { PostgrestResponse } from '@supabase/supabase-js';
import { CabinUtService } from 'src/cabinUt/cabinUt.service';

@Injectable()
export class CabinDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(CabinDatabaseService.name);
  private task: cron.ScheduledTask;

  constructor(
    private readonly configService: ConfigService,
    private readonly cabinDatabaseApi: CabinDatabaseApi,
    private readonly cabinUtService: CabinUtService,
  ) {}

  async onModuleInit() {
    if (this.configService.get('NODE_ENV') === 'production') {
      this.task = cron.schedule('0 1 * * *', this.on1am);
      this.logger.log('setup 1am cabin update');
    }
  }

  on1am = () => {
    this.logger.log('starting 1am cabin update');
    this.upsertCabinsFromUt().catch((error) => {
      this.logger.error('upsertCabinsFromUt failed with error', error);
    });
  };

  private async upsertCabinsFromUt() {
    const cabins = await this.cabinUtService.getCabins();
    const cabinSummaries = await this.cabinUtService.getCabinSummaries(cabins);
    const errors = await this.cabinDatabaseApi.upsertCabins(cabinSummaries);

    if (errors.length > 0) {
      console.log('errors');
      throw new Error(`${errors}`);
    }
  }

  async getRandomCabin(options?: {
    mustBeBookable?: boolean;
  }): Promise<CabinSummary | null> {
    const cabins = await this.getRandomCabins({
      mustBeBookable: options?.mustBeBookable,
      limit: 1,
    });
    if (cabins !== null) return cabins[0];
    return null;
  }

  async getRandomCabins(options?: {
    mustBeBookable?: boolean;
    limit?: number;
  }): Promise<CabinSummary[] | null> {
    let response: PostgrestResponse<CabinSummary>;
    if (options?.mustBeBookable) {
      response = await this.cabinDatabaseApi.getRandomBookableCabins(
        options?.limit,
      );
    }
    response = await this.cabinDatabaseApi.getAnyRandomCabins(options?.limit);
    this.evaluateResponse(response);

    return response.data;
  }

  private evaluateResponse(response: PostgrestResponse<any>) {
    if (response.statusText !== 'OK') {
      throw new Error(
        `Supabase (cabins) response not ok. Got: ${response.status}`,
      );
    }

    if (response.data === null) {
      throw new Error(
        `Supabase (cabins) did not return data. Response status is: ${response.status}`,
      );
    }
  }

  public async getNewCabins(after: Date) {
    return await this.cabinDatabaseApi.getNewCabins(after);
  }
}
