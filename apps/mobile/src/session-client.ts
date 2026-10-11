import type { AuthSession } from '../../../packages/contracts';
export type ApiRequest = (path: string, body?: unknown, token?: string) => Promise<any>;
/** One instance per active account; parallel 401s share one refresh. */
export class SessionClient {
  private refreshing?: Promise<void>;
  constructor(private session: AuthSession, private readonly send: ApiRequest, private readonly persist: (session: AuthSession) => Promise<void>) {}
  async replace(next: AuthSession) {
    if (next.ownerId !== this.session.ownerId || next.verificationKind !== this.session.verificationKind) throw new Error('ACCOUNT_ISOLATION');
    await this.persist(next);
    this.session = next;
  }
  async request(path: string, body?: unknown) {
    const token = this.session.token;
    try { return await this.send(path, body, token); }
    catch (error) {
      if (!(error instanceof Error) || error.message !== 'UNAUTHORIZED' || !this.session.refreshToken) throw error;
      if (token === this.session.token) {
        if (!this.refreshing) {
          this.refreshing = this.send('sessions/refresh', {refreshToken: this.session.refreshToken})
            .then(next => this.replace(next)).finally(() => { this.refreshing = undefined; });
        }
        await this.refreshing;
      }
      return this.send(path, body, this.session.token);
    }
  }
}
