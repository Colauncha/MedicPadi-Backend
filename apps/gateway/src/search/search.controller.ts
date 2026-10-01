import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthRole, GlobalSearchQueryDto } from '@medicpadi-backend/contracts';
import { AuthGuard } from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { SearchService } from './search.service';

// The gateway has no global ValidationPipe, so validate at the edge.
const validate = new ValidationPipe({ whitelist: true, transform: true });

@ApiTags('Search')
@ApiBearerAuth('access-token')
@Controller('search')
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles(
    AuthRole.PATIENT,
    AuthRole.CONSULTANT,
    AuthRole.PHARMACY,
    AuthRole.LAB,
    AuthRole.ADMIN,
  )
  @ApiOperation({
    summary: 'Global search',
    description:
      'Searches doctors, pharmacies, laboratories, drugs and lab tests in one call, returning up to `limit` results per type. ' +
      'Use the per-entity list endpoints with `?search=` to page through more results of one type. Accessible by all roles.',
  })
  @ApiResponse({ status: 200, description: 'Results grouped by entity type.' })
  @ApiResponse({ status: 400, description: 'Invalid query (e.g. `q` shorter than 2 characters).' })
  @ApiResponse({ status: 403, description: 'Missing or invalid token.' })
  search(@Query(validate) query: GlobalSearchQueryDto) {
    return this.searchService.globalSearch(query);
  }
}
