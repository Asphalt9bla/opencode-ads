import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token"
import bs58 from "bs58"

// ============================================================
// USDC Payout Service (Solana)
// ============================================================
// Sends USDC to users who request payouts.
// USDC mint on Solana: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
// ============================================================

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")

// Solana connection — use devnet for testing, mainnet for production
const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  "confirmed"
)

// Platform wallet (the one that holds USDC to distribute)
function getPlatformKeypair(): Keypair {
  const secretKey = process.env.SOLANA_PLATFORM_SECRET_KEY
  if (!secretKey) {
    throw new Error("SOLANA_PLATFORM_SECRET_KEY not set")
  }
  return Keypair.fromSecretKey(bs58.decode(secretKey))
}

export interface PayoutResult {
  success: boolean
  txHash?: string
  error?: string
}

/**
 * Send USDC to a user's Solana wallet
 * @param recipientWallet - User's Solana wallet address
 * @param amountUsdc - Amount in USDC (e.g., 5.00 for $5 USDC)
 */
export async function sendUsdcPayout(
  recipientWallet: string,
  amountUsdc: number
): Promise<PayoutResult> {
  try {
    const platform = getPlatformKeypair()
    const recipient = new PublicKey(recipientWallet)

    // Get or create associated token accounts
    const platformAta = await getOrCreateAssociatedTokenAccount(
      connection,
      platform,
      USDC_MINT,
      platform.publicKey
    )

    const recipientAta = await getOrCreateAssociatedTokenAccount(
      connection,
      platform,
      USDC_MINT,
      recipient
    )

    // USDC has 6 decimals on Solana
    const amount = Math.floor(amountUsdc * 1_000_000)

    // Create transfer instruction
    const transaction = new Transaction().add(
      transfer(
        connection,
        platform,
        platformAta.address,
        recipientAta.address,
        platform,
        amount
      )
    )

    // Send and confirm
    const txHash = await sendAndConfirmTransaction(connection, transaction, [
      platform,
    ])

    return {
      success: true,
      txHash,
    }
  } catch (error: any) {
    console.error("USDC payout failed:", error)
    return {
      success: false,
      error: error.message || "Unknown error",
    }
  }
}

/**
 * Check USDC balance of the platform wallet
 */
export async function getPlatformUsdcBalance(): Promise<number> {
  try {
    const platform = getPlatformKeypair()
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      platform,
      USDC_MINT,
      platform.publicKey
    )

    const balance = await connection.getTokenAccountBalance(ata.address)
    return parseFloat(balance.value.uiAmountString || "0")
  } catch (error) {
    console.error("Failed to check balance:", error)
    return 0
  }
}

/**
 * Validate a Solana wallet address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}
