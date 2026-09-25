/** Return only to this site's routes; never to an external or protocol-relative URL. */
export function safeReturnPath(path: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || (path.includes('\\') || Array.from(path).some(char => char.charCodeAt(0) < 32))) return '/my-simulations';
  return path;
}
/** Anonymous sessions must remain on the auth form. A pending upgrade must finish
 * password setup on the same user identity before redirecting to saved work. */
export function authDestination(
  user: { id: string; is_anonymous?: boolean; email_confirmed_at?: string | null } | null,
  pendingUserId: string | null,
  finishing: boolean,
): 'auth' | 'set-password' | 'workspace' {
  if (!user || user.is_anonymous) return 'auth';
  if (user.id === pendingUserId || finishing) return user.email_confirmed_at ? 'set-password' : 'auth';
  return 'workspace';
}
