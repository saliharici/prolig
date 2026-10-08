export const supportedPaymentRoles = new Set(['GENEL_KOORDINATOR', 'MUHASEBE']);

export function checkPaymentAccess(user: any): boolean {
  if (!user || !user.role) return false;
  return supportedPaymentRoles.has(user.role);
}
