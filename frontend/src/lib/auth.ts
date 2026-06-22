'use client';

export type UserRole = 'compliance_officer' | 'department_user' | 'department_head' | 'system_admin';

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    compliance_officer: 'Compliance Officer',
    department_user: 'Department User',
    department_head: 'Department Head',
    system_admin: 'System Admin',
  };
  return labels[role] ?? role;
}
