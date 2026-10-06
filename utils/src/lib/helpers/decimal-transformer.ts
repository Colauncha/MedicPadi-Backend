import { ValueTransformer } from 'typeorm';

// Postgres returns numeric/decimal columns as strings; convert them back to numbers.
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
