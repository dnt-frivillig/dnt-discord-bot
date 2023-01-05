import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CabinUtModule } from 'src/cabinUt/cabinUt.module';
import { DbModule } from 'src/db/db.module';
import { CabinDatabaseApi } from './cabinDatabase.api';
import { CabinDatabaseService } from './cabinDatabase.service';

@Module({
  imports: [ConfigModule, CabinUtModule, DbModule],
  providers: [CabinDatabaseService, CabinDatabaseApi],
  exports: [CabinDatabaseService],
})
export class CabinDatabaseModule {}
