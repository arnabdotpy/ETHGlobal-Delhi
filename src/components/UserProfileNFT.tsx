import React from 'react'
import { UserNFTData } from '../lib/hedera'
import { getTrustScoreColor, getTrustScoreLabel } from '../lib/nft-trust-update'

interface UserProfileNFTProps {
  nftData: UserNFTData
  userAddress: string
}

export default function UserProfileNFT({ nftData, userAddress }: UserProfileNFTProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img 
            src={nftData.metadata?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${userAddress}`} 
            alt="Profile NFT"
            className="w-16 h-16 rounded-lg border-2 border-indigo-400"
          />
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-xs">✓</span>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-indigo-300">{nftData.metadata?.name || `User ${userAddress.slice(0, 6)} NFT`}</h3>
            <span className="px-2 py-1 bg-indigo-600 text-xs rounded-full">Verified</span>
          </div>
          <p className="text-sm text-neutral-300 mb-2">
            {nftData.metadata?.description || 'Briq platform user NFT'}
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span>Token: {nftData.tokenId}</span>
            <span>Serial: #{nftData.serialNumber}</span>
            <a
              href={nftData.hashscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              View on Hashscan ↗
            </a>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-neutral-500 mb-1">Wallet Address</div>
          <div className="text-sm font-mono">
            {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-neutral-700">
        <div className="flex flex-wrap gap-2">
          {nftData.metadata.attributes && nftData.metadata.attributes.length > 0 ? (
            nftData.metadata.attributes.map((attr: any, index: number) => {
            // Special styling for trust scores
            const isTrustScore = attr.trait_type.includes('Trust Score')
            const isPercentage = attr.trait_type.includes('%') || attr.trait_type.includes('Percentage')
            const isScore = attr.trait_type.includes('Score') && !isTrustScore
            
            let valueColor = 'text-neutral-200'
            let bgColor = 'bg-neutral-800'
            
            if (isTrustScore) {
              const maxScore = attr.trait_type.includes('Tenant') ? 850 : 100
              valueColor = getTrustScoreColor(parseInt(attr.value), maxScore)
              bgColor = 'bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30'
            } else if (isPercentage && parseInt(attr.value) >= 90) {
              valueColor = 'text-green-400'
              bgColor = 'bg-green-900/20 border border-green-500/30'
            } else if (isScore && parseInt(attr.value) >= 80) {
              valueColor = 'text-blue-400'
              bgColor = 'bg-blue-900/20 border border-blue-500/30'
            }
            
            return (
              <div key={index} className={`${bgColor} px-2 py-1 rounded text-xs`}>
                <span className="text-neutral-400">{attr.trait_type}:</span>
                <span className={`ml-1 font-semibold ${valueColor}`}>
                  {attr.value}
                  {isTrustScore && (
                    <span className="ml-1 text-xs text-neutral-500">
                      ({getTrustScoreLabel(parseInt(attr.value), attr.trait_type.includes('Tenant') ? 850 : 100)})
                    </span>
                  )}
                </span>
              </div>
            )
            })
          ) : (
            <div className="text-sm text-neutral-500">
              No additional attributes available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}