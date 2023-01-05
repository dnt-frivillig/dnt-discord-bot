import { Injectable } from '@nestjs/common';
import { CabinSummary } from 'src/cabinDatabase/cabinDatabase.interface';
import { CabinDatabaseService } from 'src/cabinDatabase/cabinDatabase.service';
import { BookingDates } from 'src/slashCommand/commands/randomcabin.utils';
import { VisbookService } from 'src/visbook/visbook.service';
import { hasExceededTimeLimit } from './cabin.utils';

@Injectable()
export class CabinService {
  constructor(
    private readonly visbookService: VisbookService,
    private readonly cabinDatabaseService: CabinDatabaseService,
  ) {}

  async getRandomCabin(): Promise<CabinSummary | null> {
    const cabins = await this.cabinDatabaseService.getRandomCabin();
    return cabins;
  }

  async getRandomAvailableCabin(
    bookingDates: BookingDates,
  ): Promise<CabinSummary | null> {
    const ONE_MIN_IN_MILLISECONDS = 1 * 60 * 1000;
    const startTime = Date.now();

    do {
      const cabin = await this.cabinDatabaseService.getRandomCabin();
      if (cabin === null) return null;

      const cabinIsBookable = await this.visbookService.isBookingEnabled(
        cabin.visbookId,
        bookingDates,
      );
      if (!cabinIsBookable) continue;

      const cabinIsAvailable = await this.visbookService.isCabinAvailable(
        cabin.visbookId,
        bookingDates,
      );
      if (cabinIsAvailable) return cabin;
    } while (
      !hasExceededTimeLimit(startTime, Date.now(), ONE_MIN_IN_MILLISECONDS)
    );

    return null;
  }

  public async getNewCabins(after: Date) {
    return await this.cabinDatabaseService.getNewCabins(after);
  }
}
