export const OrderPatterns = {
  STATUS: 'orders.status',
  APPOINTMENTS: {
    CREATE: 'orders.appointments.create',
    UPDATE: 'orders.appointments.update',
    RETRIEVE: 'orders.appointments.retrieve',
    FIND_ALL: 'orders.appointments.findAll',
    DELETE: 'orders.appointments.delete',
  },
  PRESCRIPTIONS: {
    CREATE: 'orders.prescriptions.create',
    UPDATE: 'orders.prescriptions.update',
    RETRIEVE: 'orders.prescriptions.retrieve',
    FIND_ALL: 'orders.prescriptions.findAll',
    DELETE: 'orders.prescriptions.delete',
  },
  DRUG_REQUISITIONS: {
    CREATE: 'orders.drugRequisitions.create',
    UPDATE: 'orders.drugRequisitions.update',
    RETRIEVE: 'orders.drugRequisitions.retrieve',
    FIND_ALL: 'orders.drugRequisitions.findAll',
    DELETE: 'orders.drugRequisitions.delete',
  },
  TEST_REQUISITIONS: {
    CREATE: 'orders.testRequisitions.create',
    UPDATE: 'orders.testRequisitions.update',
    RETRIEVE: 'orders.testRequisitions.retrieve',
    FIND_ALL: 'orders.testRequisitions.findAll',
    DELETE: 'orders.testRequisitions.delete',
  },
};