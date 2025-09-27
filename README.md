# Briq Frontend (Vite + React + TS)

## Quick Start
1. Copy `.env.example` to `.env` and fill:
   - `VITE_RPC_URL` — Hedera EVM RPC (e.g. testnet)
   - `VITE_CHAIN_ID` — Hedera chain id (296 for testnet)
   - Deployed contract addresses for `VITE_HUB_ADDRESS`, `VITE_SBT_ADDRESS`, `VITE_PROPERTY_ADDRESS`

2. Install & run
   ```bash
   npm install
   npm run dev
   ```

## Notes
- The Self.xyz login is a local stub. Replace `src/lib/selfxyz.ts` with the real SDK.
- The Trust page reads your SBT tokenURI and renders attributes.
- Home lets landlords list and tenants rent (deposit is `msg.value`).