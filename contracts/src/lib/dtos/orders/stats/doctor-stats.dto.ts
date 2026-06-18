import { WeeklyChangeDto } from './weekly-change.dto';

export class DoctorStatsDto {
  totalPatients: number;
  totalAppointments: number;
  scheduledAppointments: number;
  returningPatientPercent: number | null;
  newPatientsThisWeek: number;
  totalPatientsThisWeek: number;
  weeklyChanges: {
    totalPatients: WeeklyChangeDto;
    totalAppointments: WeeklyChangeDto;
    scheduledAppointments: WeeklyChangeDto;
  };
}
