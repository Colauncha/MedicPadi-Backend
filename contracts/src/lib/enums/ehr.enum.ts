export enum EhrSourceType {
  APPOINTMENT = 'appointment',
  LAB_RESULT = 'lab_result',
  PRESCRIPTION = 'prescription',
  UPLOAD = 'upload',
}

export enum ConsentAccessLevel {
  VIEW_ONLY = 'view_only',
  FULL_ACCESS = 'full_access',
}

export enum ConsentStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}