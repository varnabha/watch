import { CommunicationRelayClient } from '@azure/communication-network-traversal';

/** Returns short-lived ACS STUN/TURN servers; no relay credentials are logged. */
export async function turn(connectionString: string) {
  const relayClient = new CommunicationRelayClient(connectionString);
  const relay = await relayClient.getRelayConfiguration();
  return { iceServers: relay.iceServers, expiresOn: relay.expiresOn };
}
