import { checkServerIdentity, type PeerCertificate, type TLSSocket } from 'node:tls';
import { RELEASE03_DB_HOST, RELEASE03_DB_NAME, RELEASE03_DB_ROLE } from './release03-db-policy.js';

const BLOCKED = 'RELEASE03_DB_GUARD_BLOCKED';

/** The source DSN must contain verify-full; pg receives explicit, stronger TLS options. */
export function release03VerifiedPgConnectionString(source: string): string {
  let url: URL;
  try { url = new URL(source); } catch { throw new Error(BLOCKED); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol) ||
      url.hostname !== RELEASE03_DB_HOST ||
      (url.port !== '' && url.port !== '5432') ||
      decodeURIComponent(url.pathname) !== '/' + RELEASE03_DB_NAME ||
      decodeURIComponent(url.username) !== RELEASE03_DB_ROLE || !url.password ||
      url.searchParams.getAll('sslmode').length !== 1 ||
      url.searchParams.get('sslmode') !== 'verify-full' ||
      ['sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'].some(key => url.searchParams.has(key))) {
    throw new Error(BLOCKED);
  }
  // pg-connection-string gives an sslmode URL parameter precedence over the
  // caller's ssl object. Remove it *only in the in-memory driver copy* to
  // guarantee use of the explicitly pinned CA/hostname-verifying TLS config.
  url.searchParams.delete('sslmode');
  return url.toString();
}

export function release03TlsOptions() {
  return {
    rejectUnauthorized: true,
    servername: RELEASE03_DB_HOST,
    minVersion: 'TLSv1.2' as const,
  };
}

export function isRelease03VerifiedTlsSocket(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const socket = value as Partial<TLSSocket>;
  if (socket.encrypted !== true || socket.authorized !== true ||
      socket.authorizationError || socket.servername !== RELEASE03_DB_HOST ||
      typeof socket.getPeerCertificate !== 'function') return false;
  try {
    const cert = socket.getPeerCertificate();
    if (!cert || !cert.raw) return false;
    return checkServerIdentity(RELEASE03_DB_HOST, cert as PeerCertificate) === undefined;
  } catch { return false; }
}
