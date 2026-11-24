export interface PeerNode {
  id: string;
  name: string;
  connectedAt: number;
}

export function createPeerNode(id: string, name: string): PeerNode {
  return {
    id,
    name,
    connectedAt: Date.now(),
  };
}
