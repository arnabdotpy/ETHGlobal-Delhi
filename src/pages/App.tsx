import React, { useEffect, useState } from 'react'
import Home from './Home'
import Trust from './Trust'
import NFTCreation from '../components/NFTCreation'
import { currentAddress, connectWallet, isWalletAvailable, setupWalletEventListeners, getAvailableWallets, WalletType, SUPPORTED_WALLETS, getConnectedWalletInfo } from '../lib/eth'
import { UserNFTData } from '../lib/hedera'
import clsx from 'clsx'

type Tab = 'home' | 'trust'
type AppState = 'login' | 'nft-creation' | 'app'

export default function App() {
  const [appState, setAppState] = useState<AppState>('login')
  const [tab, setTab] = useState<Tab>('home')
  const [addr, setAddr] = useState<string | null>(null)
  const [walletConnecting, setWalletConnecting] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [connectingWalletType, setConnectingWalletType] = useState<WalletType | null>(null)
  const [userNFT, setUserNFT] = useState<UserNFTData | null>(null)

  useEffect(() => {
    // Check current wallet address and login status
    currentAddress().then(address => {
      setAddr(address)
      if (address) {
        setIsLoggedIn(true)
        // Check if user has NFT data to determine app state
        const nftData = localStorage.getItem(`briq_user_nft_${address}`)
        if (nftData) {
          setUserNFT(JSON.parse(nftData))
          setAppState('app')
        } else {
          setAppState('nft-creation')
        }
      } else {
        setIsLoggedIn(false)
        setAppState('login')
      }
    }).catch(() => {})
    
    // Setup wallet event listeners
    if (isWalletAvailable()) {
      const cleanup = setupWalletEventListeners(
        (accounts: string[]) => {
          const address = accounts[0] ?? null
          setAddr(address)
          setWalletError(null)
          if (address) {
            setIsLoggedIn(true)
            setShowWalletModal(false)
            // Check if user has NFT to determine next state
            const nftData = localStorage.getItem(`briq_user_nft_${address}`)
            if (nftData) {
              setUserNFT(JSON.parse(nftData))
              setAppState('app')
            } else {
              setAppState('nft-creation')
            }
          } else {
            setIsLoggedIn(false)
            setAppState('login')
            setUserNFT(null)
          }
        },
        (chainId: string) => {
          console.log('Chain changed to:', chainId)
          const chainIdNum = parseInt(chainId, 16)
          if (chainIdNum !== 296) {
            setWalletError(`Wrong network detected. Please switch to Hedera Testnet (Chain ID: 296). Current: ${chainIdNum}`)
            console.warn('Network changed away from Hedera testnet. Chain ID:', chainIdNum)
          } else {
            setWalletError(null)
          }
        }
      )
      
      return cleanup
    }
  }, [])

  function handleLogin() {
    setShowWalletModal(true)
  }

  function logout() {
    setIsLoggedIn(false)
    setAddr(null)
    setUserNFT(null)
    setAppState('login')
    // Note: We can't actually disconnect the wallet programmatically
    // Users need to disconnect from their wallet extension
  }

  function handleNFTCreated(nftData: UserNFTData) {
    setUserNFT(nftData)
    setAppState('app')
  }

  async function handleConnectWallet(walletType: WalletType) {
    setWalletConnecting(true)
    setConnectingWalletType(walletType)
    setWalletError(null)
    
    try {
      const address = await connectWallet(walletType)
      setAddr(address)
      setIsLoggedIn(!!address)
      if (address) {
        setShowWalletModal(false)
      }
    } catch (error: any) {
      setWalletError(error.message)
    } finally {
      setWalletConnecting(false)
      setConnectingWalletType(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {appState !== 'login' && (
        <header className="px-4 py-3 border-b border-neutral-800 bg-neutral-900">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="font-semibold">Briq</div>
            <div className="flex items-center gap-3 text-sm">
              {isLoggedIn && addr ? (
                <>
                  <div className="flex items-center gap-2 opacity-70">
                    <span>{getConnectedWalletInfo()?.icon || '💼'}</span>
                    <span>
                      {addr.slice(0, 6)}...{addr.slice(-4)}
                    </span>
                  </div>
                  <button className="px-3 py-1 rounded bg-red-600 hover:bg-red-700" onClick={logout}>
                    Logout
                  </button>
                </>
              ) : (
                <button className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700" onClick={handleLogin}>
                  Login with Wallet
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {walletError && (
        <div className="max-w-4xl mx-auto w-full p-4">
          <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{walletError}</span>
            <button 
              onClick={() => setWalletError(null)}
              className="text-red-300 hover:text-red-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 w-full">
        {appState === 'login' && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🏠</div>
              <h1 className="text-3xl font-bold mb-4">Welcome to Briq</h1>
              <p className="text-neutral-300 mb-8">
                The decentralized rental trust & reputation platform
              </p>
              <button 
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium text-lg"
                onClick={handleLogin}
              >
                Connect Wallet to Start
              </button>
            </div>
          </div>
        )}
        
        {appState === 'nft-creation' && addr && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <NFTCreation 
              userAddress={addr} 
              onNFTCreated={handleNFTCreated}
            />
          </div>
        )}
        
        {appState === 'app' && (
          <>
            {/* Network Warning Banner */}
            {walletError && walletError.includes('Wrong network') && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 mx-4 mt-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-yellow-300 text-sm">
                    {walletError}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const { addHederaTestnet } = await import('../lib/eth')
                        await addHederaTestnet()
                        setWalletError(null)
                      } catch (error: any) {
                        setWalletError(error.message)
                      }
                    }}
                    className="px-3 py-1 bg-yellow-500 text-black text-xs rounded font-medium hover:bg-yellow-400"
                  >
                    Add Network
                  </button>
                </div>
              </div>
            )}
            
            <div className="max-w-4xl mx-auto w-full p-4">
              {tab === 'home' ? <Home userNFT={userNFT} userAddress={addr} /> : <Trust />}
            </div>
            
            <nav className="sticky bottom-0 w-full bg-neutral-900 border-t border-neutral-800">
              <div className="max-w-4xl mx-auto grid grid-cols-2">
                <button className={clsx("py-3", tab==='home' && 'bg-neutral-800')} onClick={() => setTab('home')}>Home</button>
                <button className={clsx("py-3", tab==='trust' && 'bg-neutral-800')} onClick={() => setTab('trust')}>Trust</button>
              </div>
            </nav>
          </>
        )}
      </main>

      {/* Wallet Connection Modal */}
      {showWalletModal && appState === 'login' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
              <button 
                onClick={() => {
                  setShowWalletModal(false)
                  setWalletError(null)
                }}
                className="text-neutral-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-neutral-300 text-sm">
                Choose your preferred wallet to access Briq's decentralized rental platform
              </p>
              
              {walletError && (
                <div className="bg-red-900/20 border border-red-500 text-red-300 px-3 py-2 rounded text-sm">
                  {walletError}
                </div>
              )}
              
              {(() => {
                const availableWallets = getAvailableWallets()
                const unavailableWallets = SUPPORTED_WALLETS.filter(w => !availableWallets.find(a => a.type === w.type))
                
                return (
                  <div className="space-y-3">
                    {/* Available Wallets */}
                    {availableWallets.map((wallet) => (
                      <button
                        key={wallet.type}
                        onClick={() => handleConnectWallet(wallet.type)}
                        disabled={walletConnecting}
                        className={clsx(
                          "w-full p-4 border rounded-lg transition-colors flex items-center gap-3 text-left",
                          walletConnecting && connectingWalletType === wallet.type
                            ? "border-indigo-500 bg-indigo-900/20"
                            : "border-neutral-700 hover:border-neutral-600",
                          walletConnecting ? "opacity-50 cursor-not-allowed" : ""
                        )}
                      >
                        <div className="text-2xl">{wallet.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium">{wallet.name}</div>
                          <div className="text-sm text-neutral-400">
                            {walletConnecting && connectingWalletType === wallet.type 
                              ? "Connecting..." 
                              : wallet.description
                            }
                          </div>
                        </div>
                        {walletConnecting && connectingWalletType === wallet.type ? (
                          <div className="w-4 h-4 border-2 border-neutral-400 border-t-indigo-400 rounded-full animate-spin"></div>
                        ) : (
                          <div className="text-neutral-400">→</div>
                        )}
                      </button>
                    ))}
                    
                    {/* Unavailable Wallets - Show as install options */}
                    {unavailableWallets.length > 0 && (
                      <>
                        <div className="text-sm text-neutral-500 text-center mt-6 mb-3">
                          Don't have a wallet? Install one:
                        </div>
                        {unavailableWallets.map((wallet) => (
                          wallet.downloadUrl && (
                            <a
                              key={wallet.type}
                              href={wallet.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full p-4 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors flex items-center gap-3 text-left opacity-75 hover:opacity-100"
                            >
                              <div className="text-2xl grayscale">{wallet.icon}</div>
                              <div className="flex-1">
                                <div className="font-medium">Install {wallet.name}</div>
                                <div className="text-sm text-neutral-500">{wallet.description}</div>
                              </div>
                              <div className="text-neutral-500">↗</div>
                            </a>
                          )
                        ))}
                      </>
                    )}
                    
                    {availableWallets.length === 0 && (
                      <div className="text-center py-4">
                        <div className="text-amber-400 text-sm mb-4">
                          No wallets detected. Please install a Web3 wallet to continue.
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              
              <div className="text-xs text-neutral-400 text-center border-t border-neutral-800 pt-4">
                By connecting your wallet, you agree to our terms of service
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}