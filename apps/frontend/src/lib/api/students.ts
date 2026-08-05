import { apiFetch } from "./client";

export type StudentFieldType = "TEXT" | "NUMBER" | "DROPDOWN" | "DATE";

export type FieldDefinition = {
  id: string;
  universityId: string;
  label: string;
  fieldType: StudentFieldType;
  required: boolean;
  options: string[] | null;
  createdAt: string;
};

export type CustomFieldWithValue = {
  id: string;
  label: string;
  fieldType: StudentFieldType;
  required: boolean;
  options: string[] | null;
  value: string | null;
};

export type StudentProfile = {
  userId: string;
  programId: string;
  cgpa: string;
  backlogCount: number;
  placementLocked: boolean;
  studentId: string | null;
  tenthPercentage: string | null;
  twelfthPercentage: string | null;
  bloodGroup: string | null;
  address: string | null;
  phone: string | null;
  verified: boolean;
  user: { id: string; name: string; email: string; university: { id: string; name: string } };
  program: { id: string; name: string };
  customFields: CustomFieldWithValue[];
};

export type StudentRosterEntry = {
  userId: string;
  cgpa: string;
  backlogCount: number;
  verified: boolean;
  user: { id: string; name: string; email: string };
  program: { id: string; name: string };
};

export function getMyProfile(token: string) {
  return apiFetch<StudentProfile>("/students/me", { token });
}

export function updateMyProfile(
  patch: {
    studentId?: string | null;
    tenthPercentage?: number | null;
    twelfthPercentage?: number | null;
    bloodGroup?: string | null;
    address?: string | null;
    phone?: string | null;
    customFieldValues?: Record<string, string>;
  },
  token: string
) {
  return apiFetch<StudentProfile>("/students/me", { method: "PATCH", body: patch, token });
}

export function listStudents(token: string) {
  return apiFetch<StudentRosterEntry[]>("/students", { token });
}

export function getStudentProfile(userId: string, token: string) {
  return apiFetch<StudentProfile>(`/students/${userId}`, { token });
}

export function setStudentVerified(userId: string, verified: boolean, token: string) {
  return apiFetch<StudentRosterEntry>(`/students/${userId}/verify`, {
    method: "PATCH",
    body: { verified },
    token,
  });
}

export function listFieldDefinitions(token: string) {
  return apiFetch<FieldDefinition[]>("/students/field-definitions", { token });
}

export function createFieldDefinition(
  input: { label: string; fieldType: StudentFieldType; required: boolean; options?: string[] },
  token: string
) {
  return apiFetch<FieldDefinition>("/students/field-definitions", {
    method: "POST",
    body: input,
    token,
  });
}

export function deleteFieldDefinition(id: string, token: string) {
  return apiFetch<void>(`/students/field-definitions/${id}`, { method: "DELETE", token });
}
