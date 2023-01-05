import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityDatabaseModule } from 'src/activityDatabase/activityDatabase.module';
import { DbModule } from 'src/db/db.module';
import { ActivityService } from './activity.service';

@Module({
  imports: [ConfigModule, ActivityDatabaseModule, DbModule],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
