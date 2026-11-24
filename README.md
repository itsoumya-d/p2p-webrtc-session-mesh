# p2p-webrtc-session-mesh

A modular, local-first peer-to-peer session mesh and message synchronization engine designed for distributed real-time applications.

## Architecture

- **Local-First P2P Mesh**: Decentralized node discovery, direct peer connection state machine, and ICE candidate negotiation.
- **Deterministic Vector Clocks**: Causally consistent message ordering without centralized coordination servers.
- **Connection Pooling & Resiliency**: Automatic keep-alive pinging, heartbeat monitoring, and automatic failover reconnection.

## Quickstart

```bash
# Install dependencies
npm install

# Run test suite
npm test

# Build TypeScript artifacts
npm run build
```
