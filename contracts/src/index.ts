import authPatterns from './lib/patterns/auth.patterns';

///////// Exports /////////
// Enums
export * from './lib/enums/auth.enum';
export * from './lib/enums/doctor.enum';
export * from './lib/enums/patient.enum';
export * from './lib/enums/appointment-status.enum';
export * from './lib/enums/requisition-status.enum';
export * from './lib/enums/prescription-status.enum';
export * from './lib/enums/payment-status.enum';
export * from './lib/enums/notification.enum';
export * from './lib/enums/ehr.enum';
export * from './lib/enums/transaction.enum';

// DTOs
// auth DTOs
export * from './lib/dtos/auth/create-auth.dto';
export * from './lib/dtos/auth/update-auth.dto';
export * from './lib/dtos/auth/get-auth.dto';
export * from './lib/dtos/auth/login.dto';
export * from './lib/dtos/auth/reset-password.dto';

// profile DTOs
export * from './lib/dtos/profile/doctor/create-doctor.dto';
export * from './lib/dtos/profile/doctor/update-doctor.dto';
export * from './lib/dtos/profile/admin/create-admin.dto';
export * from './lib/dtos/profile/admin/update-admin.dto';
export * from './lib/dtos/profile/patient/create-patient.dto';
export * from './lib/dtos/profile/patient/update-patient.dto';
export * from './lib/dtos/profile/pharmacy/create-pharmacy.dto';
export * from './lib/dtos/profile/pharmacy/update-pharmacy.dto';
export * from './lib/dtos/profile/laboratory/create-laboratory.dto';
export * from './lib/dtos/profile/laboratory/update-laboratory.dto';
export * from './lib/dtos/profile/update-business-hours.dto';
export * from './lib/dtos/profile/pagination.dto';
export * from './lib/dtos/profile/settings.dto';

// Notification DTOs
export * from './lib/dtos/notification/create-notification.dto';
export * from './lib/dtos/notification/update-notification.dto';

// Notification event DTOs (slim domain-event payloads emitted by callers)
export * from './lib/dtos/notification/events/appointment.event.dto';
export * from './lib/dtos/notification/events/requisition.event.dto';
export * from './lib/dtos/notification/events/payment.event.dto';

// Auth-triggered email DTOs (callers already hold this data at emit time)
export * from './lib/dtos/email/welcome.dto';
export * from './lib/dtos/email/waitlist.dto';
export * from './lib/dtos/email/reset-password.dto';

// Service DTOs
export * from './lib/dtos/services/lab-tests/create-lab-test.dto';
export * from './lib/dtos/services/lab-tests/update-lab-test.dto';
export * from './lib/dtos/services/department/create-department.dto';
export * from './lib/dtos/services/department/update-department.dto';
export * from './lib/dtos/services/pharmacy-drugs/create-pharmacy-drug.dto';
export * from './lib/dtos/services/pharmacy-drugs/update-pharmacy-drug.dto';
export * from './lib/dtos/services/drug-category/create-drug-category.dto';
export * from './lib/dtos/services/drug-category/update-drug-category.dto';

// Order DTOs
export * from './lib/dtos/orders/appointments/create-appointment.dto';
export * from './lib/dtos/orders/appointments/update-appointment.dto';
export * from './lib/dtos/orders/appointments/doctor.get-appointment.dto';
export * from './lib/dtos/orders/appointments/patient.get-appointment.dto';
export * from './lib/dtos/orders/prescriptions/create-prescription-item.dto';
export * from './lib/dtos/orders/prescriptions/create-prescription.dto';
export * from './lib/dtos/orders/prescriptions/update-prescription.dto';
export * from './lib/dtos/orders/drug-requisition/create-drug-requisition-item.dto';
export * from './lib/dtos/orders/drug-requisition/create-drug-requisition.dto';
export * from './lib/dtos/orders/drug-requisition/update-drug-requisition.dto';
export * from './lib/dtos/orders/test-requisition/create-test-requisition-item.dto';
export * from './lib/dtos/orders/test-requisition/create-test-requisition.dto';
export * from './lib/dtos/orders/test-requisition/update-test-requisition.dto';
export * from './lib/dtos/orders/test-requisition/decline-test-requisition.dto';
export * from './lib/dtos/orders/stats/weekly-change.dto';
export * from './lib/dtos/orders/stats/doctor-stats.dto';
export * from './lib/dtos/orders/stats/lab-stats.dto';
export * from './lib/dtos/orders/stats/pharmacy-stats.dto';

// EHR DTOs
export * from './lib/dtos/ehr/create-ehr-record.dto';
export * from './lib/dtos/ehr/update-ehr-record.dto';
export * from './lib/dtos/ehr/create-consent-grant.dto';
export * from './lib/dtos/ehr/update-consent-grant.dto';

// Community DTOs
export * from './lib/dtos/community/create-community-group.dto';
export * from './lib/dtos/community/update-community-group.dto';
export * from './lib/dtos/community/create-community-post.dto';
export * from './lib/dtos/community/update-community-post.dto';

// Transaction DTOs
export * from './lib/dtos/transactions/create-transaction.dto';
export * from './lib/dtos/transactions/update-transaction.dto';
export * from './lib/dtos/transactions/create-wallet.dto';
export * from './lib/dtos/transactions/create-wallet.dto';

// AI Agent DTOs
export * from './lib/dtos/ai-agent/send-message.dto';
export * from './lib/dtos/ai-agent/run-agent.dto';
export * from './lib/dtos/ai-agent/process-document.dto';

// Patterns
export const AuthPatterns = authPatterns;
export * from './lib/patterns/profile.patterns';
export * from './lib/patterns/notification.patterns';
export * from './lib/patterns/service.patterns';
export * from './lib/patterns/order.patterns';
export * from './lib/patterns/ehr.patterns';
export * from './lib/patterns/community.patterns';
export * from './lib/patterns/transaction.patterns';
export * from './lib/patterns/ai-agent.patterns';

// Types and Interfaces
export * from './lib/interfaces/profile.types';
export * from './lib/interfaces/test-offered.interface';
export * from './lib/interfaces/business-hours.interface';
export * from './lib/interfaces/paystack.interface';

// Entity
export * from './lib/entity/base.entity';

// Errors
export * from './lib/errors/service-error.interface';
export * from './lib/errors/gateway-exception.filter';