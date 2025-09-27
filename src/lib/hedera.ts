import {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenMintTransaction,
  TokenAssociateTransaction,
  TransferTransaction
} from '@hashgraph/sdk'

// Hedera configuration
const MY_ACCOUNT_ID = AccountId.fromString(import.meta.env.VITE_HEDERA_ACCOUNT_ID || "0.0.6914602")
const MY_PRIVATE_KEY = PrivateKey.fromStringED25519(import.meta.env.VITE_HEDERA_PRIVATE_KEY || "df36cca4c74d003cf80aae0b9ebc47247c4a608e7cfd296a6c4c9622fc4256c3")

let client: Client | null = null

function getClient(): Client {
  if (!client) {
    client = Client.forTestnet()
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY)
  }
  return client
}

export interface TokenCreationResult {
  tokenId: string
  transactionId: string
  status: string
  hashscanUrl: string
}

export interface NFTMintResult {
  tokenId: string
  serialNumber: string
  transactionId: string
  status: string
  hashscanUrl: string
}

// Create a fungible token
export async function createFungibleToken(
  tokenName: string = "Briq Token",
  tokenSymbol: string = "BRIQ",
  initialSupply: number = 5000
): Promise<TokenCreationResult> {
  const client = getClient()
  
  try {
    // Create the transaction and freeze for manual signing
    const txTokenCreate = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setInitialSupply(initialSupply)
      .freezeWith(client)

    // Sign the transaction with the token treasury account private key
    const signTxTokenCreate = await txTokenCreate.sign(MY_PRIVATE_KEY)

    // Sign the transaction with the client operator private key and submit to a Hedera network
    const txTokenCreateResponse = await signTxTokenCreate.execute(client)

    // Get the receipt of the transaction
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client)

    // Get the token ID from the receipt
    const tokenId = receiptTokenCreateTx.tokenId!

    // Get the transaction consensus status
    const statusTokenCreateTx = receiptTokenCreateTx.status

    // Get the Transaction ID
    const txTokenCreateId = txTokenCreateResponse.transactionId.toString()

    console.log("--------------------------------- Token Creation ---------------------------------")
    console.log("Receipt status           :", statusTokenCreateTx.toString())
    console.log("Transaction ID           :", txTokenCreateId)
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txTokenCreateId)
    console.log("Token ID                 :", tokenId.toString())

    return {
      tokenId: tokenId.toString(),
      transactionId: txTokenCreateId,
      status: statusTokenCreateTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/tx/" + txTokenCreateId
    }
  } catch (error) {
    console.error('Error creating fungible token:', error)
    throw error
  }
}

// Create an NFT token
export async function createNFTToken(
  tokenName: string = "Briq User NFT",
  tokenSymbol: string = "BRIQNFT"
): Promise<TokenCreationResult> {
  const client = getClient()
  
  try {
    // Create the transaction and freeze for manual signing
    const txTokenCreate = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setSupplyKey(MY_PRIVATE_KEY)
      .setMetadataKey(MY_PRIVATE_KEY)
      .freezeWith(client)

    // Sign the transaction with the token treasury account private key
    const signTxTokenCreate = await txTokenCreate.sign(MY_PRIVATE_KEY)

    // Sign the transaction with the client operator private key and submit to a Hedera network
    const txTokenCreateResponse = await signTxTokenCreate.execute(client)

    // Get the receipt of the transaction
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client)

    // Get the token ID from the receipt
    const tokenId = receiptTokenCreateTx.tokenId!

    // Get the transaction consensus status
    const statusTokenCreateTx = receiptTokenCreateTx.status

    // Get the Transaction ID
    const txTokenCreateId = txTokenCreateResponse.transactionId.toString()

    console.log("--------------------------------- NFT Creation ---------------------------------")
    console.log("Receipt status           :", statusTokenCreateTx.toString())
    console.log("Transaction ID           :", txTokenCreateId)
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txTokenCreateId)
    console.log("Token ID                 :", tokenId.toString())

    return {
      tokenId: tokenId.toString(),
      transactionId: txTokenCreateId,
      status: statusTokenCreateTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/tx/" + txTokenCreateId
    }
  } catch (error) {
    console.error('Error creating NFT token:', error)
    throw error
  }
}

// Mint an NFT with metadata
export async function mintUserNFT(
  tokenId: string,
  userAddress: string,
  userName: string = "Briq User"
): Promise<NFTMintResult> {
  const client = getClient()
  
  try {
    // Create compact NFT metadata (reduced size to avoid METADATA_TOO_LONG error)
    const metadata = {
      name: userName.length > 20 ? userName.substring(0, 20) + "..." : userName,
      description: "Briq user profile",
      image: `https://api.dicebear.com/7.x/identicon/svg?seed=${userAddress}`,
      attributes: [
        {
          trait_type: "Platform",
          value: "Briq"
        },
        {
          trait_type: "Type",
          value: "User"
        },
        {
          trait_type: "Address",
          value: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
        }
      ]
    }

    // Try with minimal metadata first, fallback to no metadata if it fails
    let txMint
    
    try {
      // Attempt with very minimal metadata (just first few chars of name)
      const minimalMetadata = userName.substring(0, 8) // Even smaller - just 8 chars
      const metadataBytes = new TextEncoder().encode(minimalMetadata)
      
      console.log('Attempting NFT creation with minimal metadata:', minimalMetadata, 'Size:', metadataBytes.length, 'bytes')
      
      txMint = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([metadataBytes])
        .freezeWith(client)
        
    } catch (metadataError) {
      console.log('Minimal metadata failed, creating NFT without metadata')
      
      // Fallback: Create NFT without any metadata
      txMint = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .freezeWith(client)
    }

    // Sign the transaction with the supply key
    const signTxMint = await txMint.sign(MY_PRIVATE_KEY)

    // Submit the transaction to a Hedera network
    const txMintResponse = await signTxMint.execute(client)

    // Get the receipt of the transaction
    const receiptMintTx = await txMintResponse.getReceipt(client)

    // Get the serial numbers from the receipt
    const serialNumbers = receiptMintTx.serials

    // Get the transaction consensus status
    const statusMintTx = receiptMintTx.status

    // Get the Transaction ID
    const txMintId = txMintResponse.transactionId.toString()

    console.log("--------------------------------- NFT Mint ---------------------------------")
    console.log("Receipt status           :", statusMintTx.toString())
    console.log("Transaction ID           :", txMintId)
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txMintId)
    console.log("Serial Numbers           :", serialNumbers.map(s => s.toString()).join(", "))

    return {
      tokenId: tokenId,
      serialNumber: serialNumbers[0]?.toString() || "1",
      transactionId: txMintId,
      status: statusMintTx.toString(),
      hashscanUrl: "https://hashscan.io/testnet/tx/" + txMintId
    }
  } catch (error) {
    console.error('Error minting NFT:', error)
    throw error
  }
}

// Get user's NFT data from localStorage or create new one
export interface UserNFTData {
  tokenId: string
  serialNumber: string
  metadata: any
  transactionId: string
  hashscanUrl: string
}

export async function getUserNFT(userAddress: string): Promise<UserNFTData | null> {
  const storageKey = `briq_user_nft_${userAddress}`
  const stored = localStorage.getItem(storageKey)
  
  if (stored) {
    return JSON.parse(stored)
  }
  
  return null
}

export async function createUserNFT(userAddress: string, userName?: string): Promise<UserNFTData> {
  try {
    console.log('Creating NFT for user:', userAddress, 'Name:', userName)
    
    // First create the NFT token collection if needed
    let nftTokenId = localStorage.getItem('briq_nft_token_id')
    
    if (!nftTokenId) {
      console.log('Creating new NFT token collection...')
      const tokenResult = await createNFTToken("Briq Users", "BRIQ") // Shorter names
      nftTokenId = tokenResult.tokenId
      localStorage.setItem('briq_nft_token_id', nftTokenId)
      console.log('Created NFT collection with token ID:', nftTokenId)
    } else {
      console.log('Using existing NFT collection:', nftTokenId)
    }
    
    // Mint the NFT for the user
    console.log('Minting NFT for user...')
    const mintResult = await mintUserNFT(nftTokenId, userAddress, userName)
    console.log('NFT minted successfully:', mintResult)
    
    // Create user NFT data with full metadata for local storage
    const userNFTData: UserNFTData = {
      tokenId: mintResult.tokenId,
      serialNumber: mintResult.serialNumber,
      metadata: {
        name: `${userName || 'Briq User'} Profile NFT`,
        description: `Briq platform user profile NFT`,
        image: `https://api.dicebear.com/7.x/identicon/svg?seed=${userAddress}`,
        attributes: [
          { trait_type: "Platform", value: "Briq" },
          { trait_type: "User Type", value: "Verified User" },
          { trait_type: "Wallet", value: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` },
          { trait_type: "Created", value: new Date().toLocaleDateString() }
        ]
      },
      transactionId: mintResult.transactionId,
      hashscanUrl: mintResult.hashscanUrl
    }
    
    // Store in localStorage
    const storageKey = `briq_user_nft_${userAddress}`
    localStorage.setItem(storageKey, JSON.stringify(userNFTData))
    
    return userNFTData
  } catch (error: any) {
    console.error('Error creating user NFT:', error)
    
    // Provide more specific error messages
    if (error.message?.includes('METADATA_TOO_LONG')) {
      throw new Error('Unable to create NFT: Metadata size exceeded. Please try with a shorter name.')
    } else if (error.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
      throw new Error('Insufficient account balance to create NFT. Please ensure the Hedera account has enough HBAR.')
    } else if (error.message?.includes('TOKEN_NOT_FOUND')) {
      throw new Error('NFT token not found. Please try again.')
    } else {
      throw new Error(`NFT creation failed: ${error.message || 'Unknown error'}`)
    }
  }
}

export function closeClient() {
  if (client) {
    client.close()
    client = null
  }
}