import { api, fetchPage } from '@/shared/api/client';
import type {
  AnalystSpecialty,
  OperationRegion,
  Role,
} from '@/shared/api/enums';
import type {
  AuditLogResponse,
  CreateStaffBody,
  CursorPage,
  ReferenceItemResponse,
  StaffResponse,
} from '@/shared/api/contract';
import { endpoints } from '@/shared/api/endpoints';

export function listStaff(limit = 100): Promise<CursorPage<StaffResponse>> {
  return fetchPage(endpoints.staff.root, { query: { limit } });
}

export function getStaff(staffId: string) {
  return api.get<StaffResponse>(endpoints.staff.byId(staffId));
}

export async function createStaff(body: CreateStaffBody): Promise<StaffResponse> {
  return (await api.post<StaffResponse>(endpoints.staff.root, { body })).data;
}

export interface StaffEditValues {
  firstName: string;
  lastName: string;
  role: Role;
  specialties: AnalystSpecialty[];
  regions: OperationRegion[];
  assignmentEnabled: boolean;
  isActive: boolean;
}

export async function updateStaffFully(
  current: StaffResponse,
  values: StaffEditValues,
): Promise<StaffResponse> {
  let version = current.version;
  let updated = current;
  const profileChanged =
    values.firstName !== current.firstName ||
    values.lastName !== current.lastName ||
    values.assignmentEnabled !== current.assignmentEnabled ||
    values.isActive !== current.isActive;
  const sameItems = <T extends string>(left: T[], right: T[]) =>
    left.length === right.length && left.every((item) => right.includes(item));

  if (profileChanged) {
    const response = await api.patch<StaffResponse>(endpoints.staff.byId(current.id), {
      ifMatch: version,
      body: {
        firstName: values.firstName,
        lastName: values.lastName,
        assignmentEnabled: values.assignmentEnabled,
        isActive: values.isActive,
      },
    });
    updated = response.data;
    version = response.etag ?? response.data.version;
  }

  if (values.role !== current.role) {
    const response = await api.put<StaffResponse>(endpoints.staff.role(current.id), {
      ifMatch: version,
      body: { role: values.role },
    });
    updated = response.data;
    version = response.etag ?? response.data.version;
  }

  if (!sameItems(values.specialties, current.specialties)) {
    const response = await api.put<StaffResponse>(endpoints.staff.specialties(current.id), {
      ifMatch: version,
      body: { specialties: values.specialties },
    });
    updated = response.data;
    version = response.etag ?? response.data.version;
  }

  if (!sameItems(values.regions, current.regions)) {
    const response = await api.put<StaffResponse>(endpoints.staff.regions(current.id), {
      ifMatch: version,
      body: { regions: values.regions },
    });
    updated = response.data;
  }
  return updated;
}

export async function getStaffReferences(): Promise<{
  roles: ReferenceItemResponse[];
  specialties: ReferenceItemResponse[];
  regions: ReferenceItemResponse[];
}> {
  const [roles, specialties, regions] = await Promise.all([
    api.get<ReferenceItemResponse[]>(endpoints.reference.roles),
    api.get<ReferenceItemResponse[]>(endpoints.reference.specialties),
    api.get<ReferenceItemResponse[]>(endpoints.reference.regions),
  ]);
  return { roles: roles.data, specialties: specialties.data, regions: regions.data };
}

export function listAuditLogs({
  action,
  cursor,
  limit = 30,
}: {
  action?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<CursorPage<AuditLogResponse>> {
  return fetchPage(endpoints.audit.logs, { query: { action, cursor, limit } });
}
