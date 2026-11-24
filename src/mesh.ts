/**
 * Peer-to-peer mesh session manager with vector-clock causal ordering
 * and decentralized local-first message synchronization.
 */

export type ConnectionState = "connecting" | "connected" | "disconnected" | "failed";

export interface MeshMessage<T = unknown> {
  id: string;
  senderId: string;
  topic: string;
  payload: T;
  clock: Record<string, number>;
  timestamp: number;
}

export class VectorClock {
  private clock: Map<string, number>;

  constructor(initial: Record<string, number> = {}) {
    this.clock = new Map(Object.entries(initial));
  }

  public get(nodeId: string): number {
    return this.clock.get(nodeId) || 0;
  }

  public tick(nodeId: string): number {
    const next = this.get(nodeId) + 1;
    this.clock.set(nodeId, next);
    return next;
  }

  public merge(other: Record<string, number>): void {
    for (const [nodeId, count] of Object.entries(other)) {
      this.clock.set(nodeId, Math.max(this.get(nodeId), count));
    }
  }

  public toJSON(): Record<string, number> {
    return Object.fromEntries(this.clock.entries());
  }

  public static compare(
    a: Record<string, number>,
    b: Record<string, number>
  ): "before" | "after" | "concurrent" | "equal" {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let aGreater = false;
    let bGreater = false;

    for (const key of allKeys) {
      const valA = a[key] || 0;
      const valB = b[key] || 0;
      if (valA > valB) aGreater = true;
      if (valB > valA) bGreater = true;
    }

    if (!aGreater && !bGreater) return "equal";
    if (aGreater && !bGreater) return "after";
    if (!aGreater && bGreater) return "before";
    return "concurrent";
  }
}

export interface PeerSessionOptions {
  localNodeId: string;
  heartbeatIntervalMs?: number;
}

export class PeerSession {
  public readonly localNodeId: string;
  private peers: Map<string, { state: ConnectionState; lastSeen: number }> = new Map();
  private messageLog: MeshMessage[] = [];
  private clock: VectorClock;

  constructor(options: PeerSessionOptions) {
    this.localNodeId = options.localNodeId;
    this.clock = new VectorClock({ [this.localNodeId]: 0 });
  }

  public connectPeer(peerId: string): void {
    this.peers.set(peerId, { state: "connected", lastSeen: Date.now() });
  }

  public disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.state = "disconnected";
    }
  }

  public getPeerState(peerId: string): ConnectionState {
    return this.peers.get(peerId)?.state || "disconnected";
  }

  public getActivePeers(): string[] {
    return Array.from(this.peers.entries())
      .filter(([, p]) => p.state === "connected")
      .map(([id]) => id);
  }

  public createMessage<T>(topic: string, payload: T): MeshMessage<T> {
    this.clock.tick(this.localNodeId);
    const msg: MeshMessage<T> = {
      id: `${this.localNodeId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: this.localNodeId,
      topic,
      payload,
      clock: this.clock.toJSON(),
      timestamp: Date.now(),
    };
    this.messageLog.push(msg as MeshMessage);
    return msg;
  }

  public receiveMessage(msg: MeshMessage): boolean {
    if (this.messageLog.some((m) => m.id === msg.id)) {
      return false; // deduplicate
    }

    this.clock.merge(msg.clock);
    this.clock.tick(this.localNodeId);

    const peer = this.peers.get(msg.senderId);
    if (peer) {
      peer.lastSeen = Date.now();
    }

    this.messageLog.push(msg);
    // Sort log deterministically: causal order first, then timestamp
    this.messageLog.sort((a, b) => {
      const cmp = VectorClock.compare(a.clock, b.clock);
      if (cmp === "before") return -1;
      if (cmp === "after") return 1;
      return a.timestamp - b.timestamp;
    });

    return true;
  }

  public getMessages(topic?: string): MeshMessage[] {
    if (!topic) return [...this.messageLog];
    return this.messageLog.filter((m) => m.topic === topic);
  }

  public getClock(): Record<string, number> {
    return this.clock.toJSON();
  }
}
