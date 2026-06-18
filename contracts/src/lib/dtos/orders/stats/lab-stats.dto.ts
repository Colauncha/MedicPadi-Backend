import { WeeklyChangeDto } from './weekly-change.dto';

export class LabStatsDto {
  totalPatients: number;
  totalRequisitions: number;
  pendingRequisitions: number;
  returningPatientPercent: number | null;
  newPatientsThisWeek: number;
  totalPatientsThisWeek: number;
  weeklyChanges: {
    totalPatients: WeeklyChangeDto;
    totalRequisitions: WeeklyChangeDto;
    pendingRequisitions: WeeklyChangeDto;
  };
}
