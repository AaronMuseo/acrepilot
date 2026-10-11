/** Delivery boundary. Real providers must never return codes in their public response. */
export interface CodeDelivery {
  deliver(identity: string, code: string): Promise<{developmentCode?: string}>;
}
export class FixtureDelivery implements CodeDelivery {
  async deliver(_identity: string, code: string) { return {developmentCode: code}; }
}
// No live adapter is configured; production remains fail-closed.
