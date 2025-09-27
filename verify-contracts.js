// Simple script to verify if contracts exist on the current network
import { ethers } from 'ethers'

const RPC_URL = 'https://testnet.hashio.io/api'
const provider = new ethers.JsonRpcProvider(RPC_URL, 296)

const addresses = {
  HUB: '0xDA0bab807633f07f013f94DD0E6A4F96F8742B53',
  SBT: '0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B', 
  PROPERTY: '0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47'
}

async function verifyContracts() {
  console.log('Verifying contracts on Hedera testnet (Chain ID 296)...\n')
  
  for (const [name, address] of Object.entries(addresses)) {
    try {
      const code = await provider.getCode(address)
      const hasContract = code !== '0x'
      
      console.log(`${name} (${address}):`)
      console.log(`  - Has contract code: ${hasContract}`)
      if (hasContract) {
        console.log(`  - Code length: ${code.length} characters`)
      } else {
        console.log('  - ❌ No contract found at this address')
      }
      console.log()
    } catch (error) {
      console.log(`${name} (${address}):`)
      console.log(`  - ❌ Error checking contract: ${error.message}`)
      console.log()
    }
  }
}

verifyContracts().catch(console.error)