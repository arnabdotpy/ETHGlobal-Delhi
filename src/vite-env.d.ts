/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_SBT_ADDRESS: string
  readonly VITE_PROPERTY_ADDRESS: string
  readonly VITE_HUB_ADDRESS: string
  readonly VITE_HEDERA_ACCOUNT_ID: string
  readonly VITE_HEDERA_PRIVATE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}