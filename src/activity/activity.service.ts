import { Injectable, OnModuleInit } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { ActivityDatabaseService } from 'src/activityDatabase/activityDatabase.service';
import { extractActivityData } from './activity.parser';
import * as cron from 'node-cron';

import { ConfigService } from '@nestjs/config';
import Ajv from 'ajv/dist/jtd';
import { ActivityData, ActivityDataSchema } from './activity.interface';
import { Logger } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { activities } from '@prisma/client';

@Injectable()
export class ActivityService implements OnModuleInit {
  private readonly logger = new Logger(ActivityService.name);

  private task: cron.ScheduledTask;
  constructor(
    private readonly configService: ConfigService,
    private readonly activityDatabaseService: ActivityDatabaseService,
    private readonly dbService: DbService,
  ) {}
  async onModuleInit() {
    if (this.configService.get('NODE_ENV') === 'production') {
      this.task = cron.schedule('0 10 * * *', this.on10am);
      this.logger.log('setup 10am activity scrapping');
    }
  }

  on10am = () => {
    this.logger.log('starting 10am activity scrapping');
    this.fetchAndUploadActivityData().catch((error) => {
      this.logger.error('fetchAndUploadActivityData failed with error', error);
    });
  };

  async fetchAndUploadActivityData() {
    this.logger.log('Running fetchAndUploadActivityData');
    const numPages = await this.getActivityPages(
      'https://www.dnt.no/aktiviteter/',
    );
    this.logger.log(`Fetching data for ${numPages} pages`);
    let currentPage = 1;
    while (currentPage <= numPages) {
      const links = await this.getActivityLinks(
        'https://www.dnt.no/aktiviteter/?page=' + currentPage,
      );
      const activityData = await this.fetchAllActivityData(links);
      await this.uploadData(activityData);
      currentPage += 1;
    }
  }

  async uploadData(activityData: ActivityData[]) {
    const ajv = new Ajv();
    const validator = ajv.compile(ActivityDataSchema);
    const invalidData = activityData.filter((data) => {
      return !validator(data);
    });
    this.logger.log(JSON.stringify(invalidData, null, 2));

    const error = await this.activityDatabaseService.upsertActivities(
      activityData,
    );
    this.logger.log(error);
  }

  async fetchAllActivityData(links: string[]) {
    const activityData = [];
    const uniqueLinks = new Set(links);
    this.logger.log(`Fetching data for ${uniqueLinks.size} activities`);
    for (const link of uniqueLinks) {
      try {
        activityData.push(await this.getActivityData(link));
      } catch (error) {
        this.logger.log(error);
      }
    }
    return activityData;
  }

  async getActivityData(url: string): Promise<ActivityData> {
    const html = await this.makeRequest(url);
    const {
      window: { document },
    } = new JSDOM(html);
    return extractActivityData(url, document);
  }

  async getActivityLinks(url: string) {
    const data = await this.makeRequest(url);
    const {
      window: { document },
    } = new JSDOM(data);
    const nodes = document.querySelectorAll('.aktivitet-item');
    const links = Array.from(nodes)
      .map(({ href }: any) => href)
      .map((path) => {
        if (!path.startsWith('http')) {
          const urlObject = new URL(url);
          urlObject.pathname = path;
          urlObject.search = '';
          path = urlObject.toString();
        }
        return path;
      });
    return links;
  }

  async getActivityPages(url: string) {
    const data = await this.makeRequest(url);
    const {
      window: { document },
    } = new JSDOM(data);
    const nodes = document.querySelectorAll('.aktivitet-item');
    const values = Array.from(
      document.querySelectorAll('.pagination a[data-page]'),
    )
      .map((el: HTMLAnchorElement) => {
        return el.dataset.page;
      })
      .map((str) => parseInt(str ?? '', 10))
      .filter((num) => !Number.isNaN(num));
    return Math.max(...values);
  }

  async makeRequest(url: string) {
    this.logger.log(url);
    const response = await fetch(url);
    return await response.text();
  }

  public async getNewActivities(tripType: string, after: Date) {
    return await this.dbService.prisma.$queryRaw<
      activities[]
    >`select * from "public"."activities" where ${tripType} ILIKE any("tripType") AND "createdAt" > ${after} order by "startsAt" asc`;
  }
}
