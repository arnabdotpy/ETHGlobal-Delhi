import React, { useEffect, useState } from 'react'
import { getReadContracts } from '../lib/contracts'
import { currentAddress } from '../lib/eth'

export default function Trust() {
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [uri, setUri] = useState<string | null>(null)
  const [meta, setMeta] = useState<any>(null)
  const [userAddress, setUserAddress] = useState<string | null>(null)

  useEffect(() => {
    const checkSBT = async () => {
      try {
        const address = await currentAddress()
        setUserAddress(address)
        
        if (!address) {
          setTokenId(null)
          setUri(null)
          setMeta(null)
          return
        }

        const { sbt } = getReadContracts()
        const tid = await sbt.tokenOfOwnerOrZero(address)
        if (tid && tid > 0n) {
          setTokenId(tid.toString())
          const u = await sbt.tokenURI(tid)
          setUri(u)
          // best-effort fetch
          if (u.startsWith('data:application/json')) {
            const payload = decodeURIComponent(u.split(',')[1])
            setMeta(JSON.parse(payload))
          } else if (u.startsWith('data:')) {
            const raw = atob(u.split(',')[1])
            setMeta(JSON.parse(raw))
          } else {
            fetch(u).then(r=>r.json()).then(setMeta).catch(()=>{})
          }
        } else {
          setTokenId(null)
          setUri(null)
          setMeta(null)
        }
      } catch (e) { 
        console.error(e)
        setTokenId(null)
        setUri(null)
        setMeta(null)
      }
    }

    checkSBT()
    
    // Set up interval to check wallet connection and SBT periodically
    const interval = setInterval(checkSBT, 5000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">Trust (Your Reputation SBT)</div>
      {!userAddress ? (
        <div className="text-amber-400 bg-amber-900/20 border border-amber-500/30 px-4 py-3 rounded-lg">
          Please connect your wallet to view your reputation SBT
        </div>
      ) : tokenId ? (
        <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800">
          <div className="text-sm opacity-70">Token ID: {tokenId}</div>
          <div className="text-sm break-words opacity-70">tokenURI: {uri}</div>
          {meta && (
            <div className="mt-4 grid gap-2">
              <div className="text-xl font-semibold">{meta.name}</div>
              <div className="opacity-80">{meta.description}</div>
              <div className="grid grid-cols-2 gap-2">
                {(meta.attributes || []).map((a: any, i: number)=>(
                  <div key={i} className="p-2 rounded bg-neutral-800">
                    <div className="text-xs opacity-70">{a.trait_type}</div>
                    <div className="text-sm">{a.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!meta && <div className="opacity-70">Loading metadata…</div>}
        </div>
      ) : (
        <div className="opacity-70">No SBT found for your wallet.</div>
      )}
    </div>
  )
}