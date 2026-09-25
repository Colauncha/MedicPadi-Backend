import { AuthRole } from '../../enums/auth.enum';

/** Identity of the authenticated caller, forwarded by the gateway to the EHR service. */
export interface EhrRequester {
  userId: string;
  role: AuthRole;
}
