export const supportedPaymentRoles = new Set(['GENEL_KOORDINATOR', 'MUHASEBE']);

export function checkPaymentAccess(user: any): boolean {
  if (!user || !user.role) return false;
  const roleCode = typeof user.role === 'string' ? user.role : user.role?.code;
  return supportedPaymentRoles.has(roleCode);
}
