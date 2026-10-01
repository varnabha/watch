import { CommunicationIdentityClient } from '@azure/communication-identity';
import { CommunicationRelayClient } from '@azure/communication-network-traversal';

export async function turn(connection: string) {
  const identity = new CommunicationIdentityClient(connection);
  const user = await identity.createUser();
  const token = await identity.getToken(user, ['voip']);
  const traversal = new CommunicationRelayClient(connection);
  const relay = await traversal.getRelayConfiguration(user);
  const iceServers = relay.turnServers.map((s) => ({
    urls: s.urls,
    username: s.username,
    credential: s.credential,
  }));
  return { iceServers, expiresOn: token.expiresOn };
}
