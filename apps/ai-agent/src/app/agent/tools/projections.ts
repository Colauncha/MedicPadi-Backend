/**
 * Trim downstream entities to the fields the model needs. Keeps tool results
 * small and never leaks meeting passwords, licence numbers, raw transaction
 * data, etc. into the conversation.
 */

type Obj = Record<string, any>;

function pick(src: Obj | null | undefined, keys: string[]): Obj {
  const out: Obj = {};
  if (!src) return out;
  for (const k of keys) {
    if (src[k] !== undefined && src[k] !== null) out[k] = src[k];
  }
  return out;
}

export function paginated<T>(
  res: { data?: Obj[]; meta?: Obj } | null | undefined,
  map: (row: Obj) => T,
  filter: (row: Obj) => boolean = () => true,
) {
  const rows = (res?.data ?? []).filter(filter);
  return {
    results: rows.map(map),
    page: res?.meta?.['page'],
    totalPages: res?.meta?.['total_pages'],
  };
}

export const doctorView = (d: Obj) => ({
  doctor_id: d['user_id'],
  name: [d['firstName'], d['lastName']].filter(Boolean).join(' ') || undefined,
  ...pick(d, [
    'speciality',
    'gender',
    'bio',
    'costPerSession',
    'sessionLength',
    'yearsOfService',
    'businessHours',
  ]),
});

export const pharmacyView = (p: Obj) => ({
  pharmacy_id: p['user_id'],
  ...pick(p, ['name', 'address', 'deliveryCost', 'businessHours', 'about']),
});

export const laboratoryView = (l: Obj) => ({
  lab_id: l['user_id'],
  ...pick(l, ['name', 'address', 'businessHours', 'about']),
});

export const drugView = (d: Obj) => ({
  pharmacy_drug_id: d['id'],
  pharmacy_id: d['user_id'],
  ...pick(d, [
    'name',
    'price',
    'available',
    'stock',
    'requiresPrescription',
    'dosage',
  ]),
  category: d['category']?.['name'],
});

export const labTestView = (t: Obj) => ({
  lab_test_id: t['id'],
  lab_id: t['user_id'],
  ...pick(t, ['name', 'shortName', 'price', 'available', 'TAT', 'description']),
  department: t['department']?.['name'],
});

export const appointmentView = (a: Obj) =>
  pick(a, [
    'id',
    'provider_id',
    'appointment_time',
    'description',
    'status',
    'paymentStatus',
    'sessionCost',
    'sessions',
    'sessionLen',
    'createdAt',
  ]);

export const drugOrderView = (r: Obj) => ({
  ...pick(r, [
    'id',
    'pharmacy_id',
    'prescription_id',
    'status',
    'payment_status',
    'delivery_address',
    'delivery_cost',
    'total_amount',
    'notes',
    'createdAt',
  ]),
  ...(Array.isArray(r['items'])
    ? {
        items: r['items'].map((i: Obj) =>
          pick(i, ['medication_name', 'quantity', 'unit_price']),
        ),
      }
    : {}),
});

export const testRequisitionView = (r: Obj) => ({
  ...pick(r, [
    'id',
    'lab_id',
    'status',
    'payment_status',
    'total_amount',
    'notes',
    'createdAt',
  ]),
  ...(Array.isArray(r['items'])
    ? {
        items: r['items'].map((i: Obj) =>
          pick(i, ['test_name', 'unit_price', 'status', 'result', 'completed_at']),
        ),
      }
    : {}),
});
