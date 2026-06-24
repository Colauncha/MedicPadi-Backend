import { PaginationResponseDto } from '@medicpadi-backend/contracts';

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResponseDto<T> {
  const total_pages = Math.ceil(total / limit) || 1;
  return {
    data,
    meta: {
      total,
      count: data.length,
      limit,
      page,
      total_pages,
    },
    links: {
      first: `?page=1&limit=${limit}`,
      next: page < total_pages ? `?page=${page + 1}&limit=${limit}` : null,
      previous: page > 1 ? `?page=${page - 1}&limit=${limit}` : null,
      last: `?page=${total_pages}&limit=${limit}`,
    },
  };
}
