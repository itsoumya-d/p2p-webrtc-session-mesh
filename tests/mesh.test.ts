import { describe, it, expect } from "vitest";
import { PeerSession, VectorClock } from "../src/mesh.js";

describe("VectorClock", () => {
  it("increments node clock deterministically on tick", () => {
    const vc = new VectorClock();
    expect(vc.get("node-a")).toBe(0);
    expect(vc.tick("node-a")).toBe(1);
    expect(vc.tick("node-a")).toBe(2);
    expect(vc.toJSON()).toEqual({ "node-a": 2 });
  });

  it("merges remote clocks using supremum value", () => {
    const vc = new VectorClock({ "node-a": 2, "node-b": 1 });
    vc.merge({ "node-b": 4, "node-c": 3 });
    expect(vc.toJSON()).toEqual({ "node-a": 2, "node-b": 4, "node-c": 3 });
  });

  it("compares causal ordering accurately", () => {
    const c1 = { a: 1, b: 1 };
    const c2 = { a: 2, b: 1 };
    const c3 = { a: 1, b: 2 };

    expect(VectorClock.compare(c1, c2)).toBe("before");
    expect(VectorClock.compare(c2, c1)).toBe("after");
    expect(VectorClock.compare(c2, c3)).toBe("concurrent");
    expect(VectorClock.compare(c1, c1)).toBe("equal");
  });
});

describe("PeerSession", () => {
  it("manages peer connection state lifecycle", () => {
    const session = new PeerSession({ localNodeId: "local-node" });
    expect(session.getActivePeers()).toHaveLength(0);

    session.connectPeer("remote-peer-1");
    expect(session.getPeerState("remote-peer-1")).toBe("connected");
    expect(session.getActivePeers()).toContain("remote-peer-1");

    session.disconnectPeer("remote-peer-1");
    expect(session.getPeerState("remote-peer-1")).toBe("disconnected");
    expect(session.getActivePeers()).not.toContain("remote-peer-1");
  });

  it("creates and synchronizes causally ordered messages", () => {
    const nodeA = new PeerSession({ localNodeId: "node-a" });
    const nodeB = new PeerSession({ localNodeId: "node-b" });

    nodeA.connectPeer("node-b");
    nodeB.connectPeer("node-a");

    const msg1 = nodeA.createMessage("chat", { text: "Hello from A" });
    const received = nodeB.receiveMessage(msg1);

    expect(received).toBe(true);
    expect(nodeB.getMessages("chat")).toHaveLength(1);
    expect(nodeB.getMessages("chat")[0].payload).toEqual({ text: "Hello from A" });

    // Deduplication check
    const duplicate = nodeB.receiveMessage(msg1);
    expect(duplicate).toBe(false);
  });
});
