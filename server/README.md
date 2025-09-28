# Self.xyz Verification Server

A dedicated Express.js server for handling Self.xyz identity verification proofs.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on port 3000 and be accessible at `https://three.rachitkhurana.tech`

## Endpoints

- `GET /health` - Health check
- `POST /api/verify` - Self.xyz proof verification
- `GET /*` - Server info

## Configuration

The server is configured to:
- Accept CORS requests from any origin
- Handle Self.xyz proof verification
- Use mock verification (always succeeds) for demo purposes
- Log all verification requests for debugging

## Production

To enable real Self.xyz verification:
1. Uncomment the verification code in `server.js`
2. Set `mockPassport: false` for mainnet verification
3. Configure proper environment variables

## Deployment

This server should be deployed and mapped to `three.rachitkhurana.tech` for the frontend to use.
