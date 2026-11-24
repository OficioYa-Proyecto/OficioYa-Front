import { composeFullAddress } from './requestForm';

export function buildCreateRequestPayload(values, workersId) {
  return {
    workersId: workersId ?? values.workers.map((worker) => worker.id),
    description: values.description.trim(),
    neighborhood: values.neighborhood.trim(),
    exactAddress: composeFullAddress(values.exactAddress, values.addressNote),
    scheduledDateTime: `${values.date}T${values.time.slice(0, 5)}:00`,
    images: [],
  };
}