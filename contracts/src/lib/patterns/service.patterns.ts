export const ServicePatterns = {
  STATUS: 'services.status',
  LAB_TESTS: {
    CREATE: 'services.labTests.create',
    UPDATE: 'services.labTests.update',
    RETRIEVE: 'services.labTests.retrieve',
    FIND_ALL: 'services.labTests.findAll',
    DELETE: 'services.labTests.delete',
  },
  PHARMCY_DRUGS: {
    CREATE: 'services.pharmcyDrugs.create',
    UPDATE: 'services.pharmcyDrugs.update',
    RETRIEVE: 'services.pharmcyDrugs.retrieve',
    FIND_ALL: 'services.pharmcyDrugs.findAll',
    DELETE: 'services.pharmcyDrugs.delete',
    COUNT_BY_PERIOD: 'services.pharmcyDrugs.countByPeriod',
  },
  DEPARTMENTS: {
    CREATE: 'services.departments.create',
    UPDATE: 'services.departments.update',
    RETRIEVE: 'services.departments.retrieve',
    FIND_ALL: 'services.departments.findAll',
    DELETE: 'services.departments.delete',
  },
  DRUG_CATEGORIES: {
    CREATE: 'services.drugCategories.create',
    UPDATE: 'services.drugCategories.update',
    RETRIEVE: 'services.drugCategories.retrieve',
    FIND_ALL: 'services.drugCategories.findAll',
    DELETE: 'services.drugCategories.delete',
  },
};
