import React, { useState, useEffect } from 'react'
import { createUserNFT, getUserNFT, UserNFTData } from '../lib/hedera'

interface NFTCreationProps {
  userAddress: string
  onNFTCreated: (nftData: UserNFTData) => void
}

export default function NFTCreation({ userAddress, onNFTCreated }: NFTCreationProps) {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [existingNFT, setExistingNFT] = useState<UserNFTData | null>(null)

  useEffect(() => {
    // Check if user already has an NFT
    getUserNFT(userAddress).then(nft => {
      if (nft) {
        setExistingNFT(nft)
        onNFTCreated(nft)
      }
    }).catch(console.error)
  }, [userAddress, onNFTCreated])

  const handleCreateNFT = async () => {
    if (!userName.trim()) {
      setError('Please enter your name')
      return
    }

    setCreating(true)
    setError(null)

    try {
      console.log('Starting NFT creation for:', userAddress)
      const nftData = await createUserNFT(userAddress, userName.trim())
      console.log('NFT created successfully:', nftData)
      setExistingNFT(nftData)
      onNFTCreated(nftData)
    } catch (error: any) {
      console.error('NFT creation failed:', error)
      let errorMessage = 'Failed to create NFT'
      
      if (error.message?.includes('METADATA_TOO_LONG')) {
        errorMessage = 'Metadata too long. Please use a shorter name.'
      } else if (error.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
        errorMessage = 'Insufficient account balance for NFT creation.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  if (existingNFT) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-6">
          <div className="text-center">
            <div className="text-green-400 text-xl mb-4">✅</div>
            <h2 className="text-xl font-semibold mb-4">Welcome Back!</h2>
            <p className="text-neutral-300 text-sm mb-4">
              Your Briq profile NFT is ready
            </p>
            <div className="bg-neutral-800 rounded-lg p-4 mb-4">
              <img 
                src={existingNFT.metadata.image} 
                alt="Profile NFT"
                className="w-24 h-24 mx-auto rounded-lg mb-3"
              />
              <div className="text-sm">
                <div className="font-medium">{existingNFT.metadata.name}</div>
                <div className="text-neutral-400 mt-1">
                  Token ID: {existingNFT.tokenId}
                </div>
                <div className="text-neutral-400">
                  Serial: #{existingNFT.serialNumber}
                </div>
              </div>
            </div>
            <a
              href={existingNFT.hashscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              View on Hashscan ↗
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🎨</div>
          <h2 className="text-xl font-semibold mb-2">Create Your Profile NFT</h2>
          <p className="text-neutral-300 text-sm">
            Welcome to Briq! Let's create your unique profile NFT on Hedera.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
              disabled={creating}
            />
          </div>

          <div className="bg-neutral-800 rounded-lg p-4">
            <h3 className="font-medium mb-2">Your NFT will include:</h3>
            <ul className="text-sm text-neutral-300 space-y-1">
              <li>• Unique profile avatar</li>
              <li>• Verified user status</li>
              <li>• Wallet address verification</li>
              <li>• Platform membership proof</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateNFT}
            disabled={creating || !userName.trim()}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating NFT...
              </>
            ) : (
              <>
                <span>🎨</span>
                Create My NFT
              </>
            )}
          </button>

          <div className="text-xs text-neutral-400 text-center">
            This will create a unique NFT on Hedera Testnet
          </div>
        </div>
      </div>
    </div>
  )
}