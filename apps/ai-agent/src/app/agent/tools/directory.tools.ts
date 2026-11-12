import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DoctorPatterns,
  DoctorsGender,
  DoctorsSpecialies,
  LaboratoryPatterns,
  PharmacyPatterns,
  ServicePatterns,
} from '@medicpadi-backend/contracts';
import { AgentRpcService } from './agent-rpc.service';
import {
  doctorView,
  drugView,
  labTestView,
  laboratoryView,
  paginated,
  pharmacyView,
} from './projections';
import { ReadTool } from './tool.types';

const PAGE_SIZE = 10;

const pageProp = {
  page: { type: 'integer', minimum: 1, description: 'Results page, default 1' },
};

class PagedArgs {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}

class SearchArgs extends PagedArgs {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

class SearchDoctorsArgs extends SearchArgs {
  @IsOptional()
  @IsEnum(DoctorsSpecialies)
  speciality?: DoctorsSpecialies;

  @IsOptional()
  @IsEnum(DoctorsGender)
  gender?: DoctorsGender;
}

class SearchDrugsArgs extends SearchArgs {
  @IsOptional()
  @IsUUID()
  pharmacy_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsBoolean()
  requires_prescription?: boolean;
}

class SearchLabTestsArgs extends SearchArgs {
  @IsOptional()
  @IsUUID()
  lab_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}

export function directoryTools(rpc: AgentRpcService): ReadTool<any>[] {
  const searchDoctors: ReadTool<SearchDoctorsArgs> = {
    kind: 'read',
    argsType: SearchDoctorsArgs,
    definition: {
      name: 'search_doctors',
      description:
        'Search doctors/consultants the patient can book. Returns doctor_id, name, speciality, costPerSession, sessionLength (minutes) and businessHours.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Free-text name search' },
          speciality: {
            type: 'string',
            enum: Object.values(DoctorsSpecialies),
          },
          gender: { type: 'string', enum: Object.values(DoctorsGender) },
          ...pageProp,
        },
      },
    },
    async execute(_ctx, args) {
      const res = await rpc.send('profile', DoctorPatterns.FIND_ALL, {
        search: args.search,
        speciality: args.speciality,
        gender: args.gender,
        page: args.page ?? 1,
        limit: PAGE_SIZE,
      });
      return paginated(res, doctorView);
    },
  };

  const searchPharmacies: ReadTool<SearchArgs> = {
    kind: 'read',
    argsType: SearchArgs,
    definition: {
      name: 'search_pharmacies',
      description:
        'Search pharmacies. Returns pharmacy_id, name, address, deliveryCost and businessHours.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Name or keyword' },
          ...pageProp,
        },
      },
    },
    async execute(_ctx, args) {
      const res = await rpc.send('profile', PharmacyPatterns.FIND_ALL, {
        search: args.search,
        page: args.page ?? 1,
        limit: PAGE_SIZE,
      });
      return paginated(res, pharmacyView);
    },
  };

  const searchDrugs: ReadTool<SearchDrugsArgs> = {
    kind: 'read',
    argsType: SearchDrugsArgs,
    definition: {
      name: 'search_drugs',
      description:
        "Search drugs stocked by pharmacies. Pass pharmacy_id to search one pharmacy's catalogue. Returns pharmacy_drug_id, pharmacy_id, name, price, availability and whether a prescription is required.",
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Drug name or keyword' },
          pharmacy_id: { type: 'string', format: 'uuid' },
          category: { type: 'string' },
          requires_prescription: { type: 'boolean' },
          ...pageProp,
        },
      },
    },
    async execute(_ctx, args) {
      const res = await rpc.send('services', ServicePatterns.PHARMCY_DRUGS.FIND_ALL, {
        id: args.pharmacy_id,
        search: args.search,
        category: args.category,
        requiresPrescription: args.requires_prescription,
        page: args.page ?? 1,
        limit: PAGE_SIZE,
      });
      return paginated(res, drugView);
    },
  };

  const searchLabs: ReadTool<SearchArgs> = {
    kind: 'read',
    argsType: SearchArgs,
    definition: {
      name: 'search_labs',
      description:
        'Search diagnostic laboratories. Returns lab_id, name, address and businessHours.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Name or keyword' },
          ...pageProp,
        },
      },
    },
    async execute(_ctx, args) {
      const res = await rpc.send('profile', LaboratoryPatterns.FIND_ALL, {
        search: args.search,
        page: args.page ?? 1,
        limit: PAGE_SIZE,
      });
      return paginated(res, laboratoryView);
    },
  };

  const searchLabTests: ReadTool<SearchLabTestsArgs> = {
    kind: 'read',
    argsType: SearchLabTestsArgs,
    definition: {
      name: 'search_lab_tests',
      description:
        "Search lab tests offered by laboratories. Pass lab_id to search one lab's catalogue. Returns lab_test_id, lab_id, name, price, availability and turnaround time (TAT, hours).",
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Test name or keyword' },
          lab_id: { type: 'string', format: 'uuid' },
          department: { type: 'string' },
          ...pageProp,
        },
      },
    },
    async execute(_ctx, args) {
      const res = await rpc.send('services', ServicePatterns.LAB_TESTS.FIND_ALL, {
        id: args.lab_id,
        search: args.search,
        department: args.department,
        page: args.page ?? 1,
        limit: PAGE_SIZE,
      });
      return paginated(res, labTestView);
    },
  };

  return [searchDoctors, searchPharmacies, searchDrugs, searchLabs, searchLabTests];
}
