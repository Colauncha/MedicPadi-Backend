import { WeeklyChangeDto } from './weekly-change.dto';

export class PharmacyStatsDto {
  totalCustomers: number;
  totalProducts: number;
  totalOrders: number;
  returningCustomerPercent: number | null;
  newCustomersThisWeek: number;
  totalCustomersThisWeek: number;
  weeklyChanges: {
    totalCustomers: WeeklyChangeDto;
    totalProducts: WeeklyChangeDto;
    totalOrders: WeeklyChangeDto;
  };
}
