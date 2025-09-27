// Load ABIs and addresses from env (you'll paste the deployed addresses in .env)
import BriqHub from '../contracts/BriqHub.json'
import SBT from '../contracts/SoulboundReputation.json'
import PropertyNFT from '../contracts/PropertyNFT.json'
import { ethers } from 'ethers'
import { getProvider, getSigner } from './eth'

const HUB_ADDR = import.meta.env.VITE_HUB_ADDRESS || ''
const SBT_ADDR = import.meta.env.VITE_SBT_ADDRESS || ''
const PROP_ADDR = import.meta.env.VITE_PROPERTY_ADDRESS || ''

function c(providerOrSigner: ethers.Provider | ethers.Signer) {
  return {
    hub: new ethers.Contract(HUB_ADDR, BriqHub.abi, providerOrSigner),
    sbt: new ethers.Contract(SBT_ADDR, SBT.abi, providerOrSigner),
    prop: new ethers.Contract(PROP_ADDR, PropertyNFT.abi, providerOrSigner),
  }
}

export const getReadContracts = () => c(getProvider())
export const getWriteContracts = async () => c(await getSigner())