import authPatterns from './lib/patterns/auth.patterns';

///////// Exports /////////
// Enums
export * from './lib/enums/auth.enum';
export * from './lib/enums/doctor.enum';
export * from './lib/enums/patient.enum';

// DTOs
// auth DTOs
export * from './lib/dtos/auth/create-auth.dto';
export * from './lib/dtos/auth/update-auth.dto';
export * from './lib/dtos/auth/get-auth.dto';
export * from './lib/dtos/auth/login.dto';

// profile DTOs
export * from './lib/dtos/profile/doctor/create-doctor.dto'
export * from './lib/dtos/profile/doctor/update-doctor.dto'
export * from './lib/dtos/profile/admin/create-admin.dto'
export * from './lib/dtos/profile/admin/update-admin.dto'
export * from './lib/dtos/profile/patient/create-patient.dto'
export * from './lib/dtos/profile/patient/update-patient.dto'
export * from './lib/dtos/profile/pharmacy/create-pharmacy.dto'
export * from './lib/dtos/profile/pharmacy/update-pharmacy.dto'
export * from './lib/dtos/profile/laboratory/create-laboratory.dto'
export * from './lib/dtos/profile/laboratory/update-laboratory.dto'
export * from './lib/dtos/profile/pagination.dto';

// Notification DTOs
export * from './lib/dtos/notification/create-notification.dto';
export * from './lib/dtos/notification/update-notification.dto';
// export * from './lib/dtos/notification/get-notification.dto';

// Email DTOs
export * from './lib/dtos/email/welcome.dto';
export * from './lib/dtos/email/waitlist.dto';

// Patterns
export const AuthPatterns = authPatterns;
export * from './lib/patterns/profile.patterns';
// export * from './lib/patterns/notification.patterns';
export * from './lib/patterns/email.patterns';

// Types and Interfaces
export * from './lib/interfaces/profile.types'

// Entity
export * from './lib/entity/base.entity'