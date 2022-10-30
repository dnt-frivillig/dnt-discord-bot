import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  PostgrestResponse,
  SupabaseClient,
} from '@supabase/supabase-js';

@Injectable()
export class CabinDatabaseApi implements OnModuleInit {
  private supabase: SupabaseClient;
  private CABIN_REQUEST_DEFAULT_LIMIT = 1000; // TODO 1000 is an artificial limit to prevent limit undefined

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.getOrThrow('SUPABASE_URL');
    const supabaseKey = this.configService.getOrThrow('SUPABASE_KEY');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async upsertCabins(cabins: any[]) {
    const errors = [];
    for (const cabin of cabins) {
      const { error } = await this.supabase.from('cabins').upsert(cabin, {});
      if (error !== null) {
        errors.push(error);
      }
    }

    return errors;
  }

  async getRandomBookableCabins(
    limit = this.CABIN_REQUEST_DEFAULT_LIMIT,
  ): Promise<PostgrestResponse<any>> {
    return await this.supabase
      .rpc('get_random_cabins')
      .gt('visbookId', 0)
      .limit(limit);
  }

  async getRandomCabins(
    limit = this.CABIN_REQUEST_DEFAULT_LIMIT,
  ): Promise<PostgrestResponse<any>> {
    return await this.supabase.rpc('get_random_cabins').limit(limit);
  }
}