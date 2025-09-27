import { ethers } from 'ethers'

// Simple ethers v6 helpers. Hedera EVM works with standard EVM tooling via a proper RPC URL.
// Configure VITE_RPC_URL and optional VITE_CHAIN_ID in .env
export function getProvider() {
  const rpc = import.meta.env.VITE_RPC_URL
  if (!rpc) throw new Error('VITE_RPC_URL missing')
  
  const chainId = 296
  console.log('Creating provider for Hedera testnet, Chain ID:', chainId, 'RPC:', rpc)
  
  return new ethers.JsonRpcProvider(rpc, {
    chainId: chainId,
    name: 'hedera-testnet'
  })
}

export async function getSigner(): Promise<ethers.Signer> {
  // Assumes MetaMask is available. For WalletConnect you can integrate web3modal later.
  const anyWin = window as any
  if (!anyWin.ethereum) throw new Error('No injected wallet found')
  
  const provider = new ethers.BrowserProvider(anyWin.ethereum)
  
  try {
    const network = await provider.getNetwork()
    console.log('Current network:', network.chainId.toString(), network.name)
    
    if (network.chainId !== 296n) {
      console.log('Wrong network detected. Requesting switch to Hedera testnet...')
      
      try {
        // Try to switch to Hedera testnet
        await provider.send('wallet_switchEthereumChain', [{
          chainId: '0x128'
        }])
      } catch (switchError: any) {
        // If the network doesn't exist, add it first
        if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
          console.log('Adding Hedera testnet to wallet...')
          try {
            await provider.send('wallet_addEthereumChain', [{
              chainId: '0x128',
              chainName: 'Hedera Testnet',
              nativeCurrency: {
                name: 'HBAR',
                symbol: 'HBAR',
                decimals: 18
              },
              rpcUrls: ['https://testnet.hashio.io/api'],
              blockExplorerUrls: ['https://hashscan.io/testnet']
            }])
            console.log('Hedera testnet added successfully')
          } catch (addError: any) {
            console.error('Failed to add Hedera testnet:', addError)
            throw new Error('Failed to add Hedera testnet to wallet. Please add it manually.')
          }
        } else {
          throw switchError
        }
      }
    }
  } catch (networkError) {
    console.warn('Network check failed, proceeding anyway:', networkError)
  }
  
  await provider.send('eth_requestAccounts', [])
  return await provider.getSigner()
}

export async function currentAddress(): Promise<string | null> {
  const anyWin = window as any
  if (!anyWin.ethereum) return null
  try {
    const provider = new ethers.BrowserProvider(anyWin.ethereum)
    const accounts = await provider.send('eth_accounts', [])
    return accounts?.[0] ?? null
  } catch (error) {
    console.error('Error getting current address:', error)
    return null
  }
}

export function getConnectedWalletInfo(): WalletInfo | null {
  const anyWin = window as any
  if (!anyWin.ethereum) return null
  
  if (anyWin.ethereum.isMetaMask) {
    return SUPPORTED_WALLETS.find(w => w.type === 'metamask') || null
  }
  
  if (anyWin.ethereum.isCoinbaseWallet) {
    return SUPPORTED_WALLETS.find(w => w.type === 'coinbase') || null
  }
  
  // Default to injected for other wallets
  return SUPPORTED_WALLETS.find(w => w.type === 'injected') || null
}

export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'injected'

export interface WalletInfo {
  name: string
  type: WalletType
  icon: string
  description: string
  downloadUrl?: string
}

export const SUPPORTED_WALLETS: WalletInfo[] = [
  {
    name: 'MetaMask',
    type: 'metamask',
    icon: '🦊',
    description: 'Most popular Ethereum wallet',
    downloadUrl: 'https://metamask.io/download/'
  },
  {
    name: 'Coinbase Wallet',
    type: 'coinbase',
    icon: '🔵',
    description: 'Secure wallet by Coinbase',
    downloadUrl: 'https://www.coinbase.com/wallet'
  },
  {
    name: 'WalletConnect',
    type: 'walletconnect',
    icon: '�',
    description: 'Connect via mobile wallet'
  },
  {
    name: 'Other Wallet',
    type: 'injected',
    icon: '💼',
    description: 'Use any injected wallet'
  }
]

export async function addHederaTestnet(): Promise<void> {
  const anyWin = window as any
  if (!anyWin.ethereum) throw new Error('No wallet found')
  
  const provider = new ethers.BrowserProvider(anyWin.ethereum)
  
  try {
    await provider.send('wallet_addEthereumChain', [{
      chainId: '0x128',
      chainName: 'Hedera Testnet',
      nativeCurrency: {
        name: 'HBAR',
        symbol: 'HBAR',
        decimals: 18
      },
      rpcUrls: ['https://testnet.hashio.io/api'],
      blockExplorerUrls: ['https://hashscan.io/testnet']
    }])
    console.log('Hedera testnet added successfully')
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected adding network')
    }
    throw new Error('Failed to add Hedera testnet: ' + error.message)
  }
}

export async function connectWallet(walletType: WalletType = 'metamask'): Promise<string | null> {
  const anyWin = window as any
  
  let provider
  
  switch (walletType) {
    case 'metamask':
      if (!anyWin.ethereum?.isMetaMask) {
        throw new Error('MetaMask not found. Please install MetaMask extension.')
      }
      provider = anyWin.ethereum
      break
      
    case 'coinbase':
      if (!anyWin.ethereum?.isCoinbaseWallet && !anyWin.coinbaseWalletExtension) {
        throw new Error('Coinbase Wallet not found. Please install Coinbase Wallet extension.')
      }
      provider = anyWin.ethereum?.isCoinbaseWallet ? anyWin.ethereum : anyWin.coinbaseWalletExtension
      break
      
    case 'walletconnect':
      // For now, fallback to injected provider
      // In a full implementation, you'd integrate @walletconnect/web3-provider
      if (!anyWin.ethereum) {
        throw new Error('No wallet found. Please install a Web3 wallet.')
      }
      provider = anyWin.ethereum
      break
      
    case 'injected':
    default:
      if (!anyWin.ethereum) {
        throw new Error('No wallet found. Please install a Web3 wallet.')
      }
      provider = anyWin.ethereum
      break
  }
  
  try {
    const ethersProvider = new ethers.BrowserProvider(provider)
    
    // Ensure we're on Hedera testnet before connecting
    await ensureCorrectNetwork()
    
    const accounts = await ethersProvider.send('eth_requestAccounts', [])
    return accounts?.[0] ?? null
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('Wallet connection rejected by user')
    }
    throw new Error('Failed to connect wallet: ' + error.message)
  }
}

export function getAvailableWallets(): WalletInfo[] {
  const anyWin = window as any
  
  return SUPPORTED_WALLETS.filter(wallet => {
    switch (wallet.type) {
      case 'metamask':
        return !!anyWin.ethereum?.isMetaMask
      case 'coinbase':
        return !!anyWin.ethereum?.isCoinbaseWallet || !!anyWin.coinbaseWalletExtension
      case 'injected':
        return !!anyWin.ethereum
      case 'walletconnect':
        return true // Always show WalletConnect as option
      default:
        return false
    }
  })
}

export function isWalletAvailable(): boolean {
  return getAvailableWallets().length > 0
}

export async function ensureCorrectNetwork(): Promise<void> {
  const anyWin = window as any
  if (!anyWin.ethereum) return
  
  try {
    const provider = new ethers.BrowserProvider(anyWin.ethereum)
    const network = await provider.getNetwork()
    
    if (network.chainId !== 296n) {
      console.log('Wrong network detected, switching to Hedera testnet...')
      
      try {
        await provider.send('wallet_switchEthereumChain', [{
          chainId: '0x128' // 296 in hex
        }])
      } catch (switchError: any) {
        // If network doesn't exist, add it first
        if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
          console.log('Adding Hedera testnet to wallet...')
          await provider.send('wallet_addEthereumChain', [{
            chainId: '0x128',
            chainName: 'Hedera Testnet',
            nativeCurrency: {
              name: 'HBAR',
              symbol: 'HBAR',
              decimals: 18
            },
            rpcUrls: ['https://testnet.hashio.io/api'],
            blockExplorerUrls: ['https://hashscan.io/testnet']
          }])
          console.log('Hedera testnet added and switched successfully')
        } else {
          throw switchError
        }
      }
    } else {
      console.log('Already on Hedera testnet')
    }
  } catch (error: any) {
    console.error('Failed to ensure correct network:', error)
    // Don't throw for network issues during read operations
    if (error.message?.includes('User rejected')) {
      throw new Error('Please approve the network switch to Hedera Testnet in your wallet')
    } else if (error.message?.includes('add')) {
      throw new Error('Failed to add Hedera testnet. Please add it manually: Chain ID 296, RPC: https://testnet.hashio.io/api')
    } else {
      console.warn('Network validation failed, continuing anyway:', error.message)
    }
  }
}

export function setupWalletEventListeners(
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: string) => void
) {
  const anyWin = window as any
  if (!anyWin.ethereum) return

  // Listen for account changes
  anyWin.ethereum.on('accountsChanged', onAccountsChanged)
  
  // Listen for chain changes - ensure we stay on Hedera testnet
  const handleChainChange = (chainId: string) => {
    console.log('Chain changed to:', chainId)
    const chainIdNum = parseInt(chainId, 16)
    if (chainIdNum !== 296) {
      console.warn('Network changed away from Hedera testnet. Chain ID:', chainIdNum)
      alert('Please switch back to Hedera Testnet (Chain ID: 296) for the app to work properly.')
    }
    onChainChanged(chainId)
  }
  
  anyWin.ethereum.on('chainChanged', handleChainChange)
  
  // Return cleanup function
  return () => {
    anyWin.ethereum.removeListener('accountsChanged', onAccountsChanged)
    anyWin.ethereum.removeListener('chainChanged', handleChainChange)
  }
}