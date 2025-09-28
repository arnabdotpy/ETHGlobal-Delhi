# Briq Frontend (Vite + React + TS)

A decentralized rental platform with Self.xyz identity verification and Hedera NFTs.

## Quick Start
1. Copy `.env.example` to `.env` and fill:
   - `VITE_RPC_URL` — Hedera EVM RPC (e.g. testnet)
   - `VITE_CHAIN_ID` — Hedera chain id (296 for testnet)
   - Deployed contract addresses for `VITE_HUB_ADDRESS`, `VITE_SBT_ADDRESS`, `VITE_PROPERTY_ADDRESS`
   - Self.xyz configuration:
     - `VITE_SELF_APP_NAME` — Your app name for Self.xyz
     - `VITE_SELF_SCOPE` — Unique identifier for your app
     - `VITE_SELF_ENDPOINT` — Backend verification endpoint URL
     - `VITE_SELF_ENDPOINT_TYPE` — staging_https or https

2. Install & run
   ```bash
   npm install --force  # Use --force due to React 19 compatibility
   npm run dev
   ```

## Self.xyz Identity Verification

This app integrates Self.xyz for identity verification before NFT creation:

### Features
- **QR Code Verification**: Users scan QR codes with the Self app
- **Mobile Deep Links**: Direct app opening for mobile users
- **Age Verification**: Minimum age 18 requirement
- **OFAC Compliance**: Sanctions list checking
- **Document Authenticity**: Real government ID verification
- **Verification Badges**: Visual indicators for verified users

### Flow
1. User connects wallet
2. Identity verification via Self.xyz (optional skip)
3. NFT creation with verification status
4. Access to platform features

### Backend API
The `/api/verify` endpoint handles proof verification:
- Validates Self.xyz zero-knowledge proofs
- Checks compliance requirements
- Returns verification status and user attributes

### Development Notes
- **QR Code Generation**: Real Self.xyz QR codes are generated and displayed
- **Verification Flow**: Users can scan QR codes with the Self app
- **Backend Verification**: Mock backend skips cryptographic verification for demo
- **Packages**: Self.xyz packages installed: `@selfxyz/qrcode @selfxyz/core`
- **Environment**: Uses staging environment for testing
- **Production**: Replace mock backend with real Self.xyz verification

## Architecture
- **Frontend**: React + TypeScript + Vite
- **Blockchain**: Hedera Hashgraph (NFTs)
- **Identity**: Self.xyz (zk-proofs)
- **Deployment**: Vercel (serverless functions)

## Notes
- The Trust page reads your SBT tokenURI and renders attributes.
- Home lets landlords list and tenants rent (deposit is `msg.value`).
- Verification data is stored locally and in NFT metadata.