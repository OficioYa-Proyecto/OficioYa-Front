import { composeFullAddress } from './requestForm';

export function buildCreateRequestPayload(values, workersId) {
  return {
    workersId: workersId ?? values.workers.map((worker) => worker.id),
    description: values.description.trim(),
    localityId: values.localityId ? Number(values.localityId) : null,
    locality: String(values.locality ?? '').trim(),
    neighborhood: String(values.neighborhood ?? '').trim(),
    exactAddress: composeFullAddress(values.exactAddress, values.addressNote),
    scheduledDateTime: `${values.date}T${values.time.slice(0, 5)}:00`,
    images: [],
  };
}