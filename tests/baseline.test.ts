import { describe, it, expect } from "vitest";
import { createPeerNode } from "../src/index.js";

describe("PeerNode baseline", () => {
  it("initializes peer node with identifier and timestamp", () => {
    const peer = createPeerNode("peer-101", "Node Alpha");
    expect(peer.id).toBe("peer-101");
    expect(peer.name).toBe("Node Alpha");
    expect(peer.connectedAt).toBeGreaterThan(0);
  });
});
