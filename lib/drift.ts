import { DriftClient, initialize, Wallet } from "@drift-labs/sdk";
import {
  PublicKey,
  Connection,
  Commitment,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AnchorProvider } from "@project-serum/anchor";

const MIN_SOL_BALANCE = 0.1; // Minimum SOL needed for transactions

async function checkSolBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<boolean> {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL >= MIN_SOL_BALANCE;
  } catch (error) {
    console.error("Error checking SOL balance:", error);
    return false;
  }
}

export const initializeDriftClient = async (
  publicKey: PublicKey,
  isViewOnly: boolean = false
): Promise<DriftClient> => {
  // Use Solana Devnet RPC
  const rpcEndpoint = "https://api.devnet.solana.com";

  // Due to rate limiting, unable to use the API Key
  // Helius RPC configuration (commented out for now)
  // const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  // const heliusRpc = `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
  // const rpcEndpoint = heliusApiKey ? heliusRpc : 'https://api.devnet.solana.com';

  const commitment: Commitment = "confirmed";

  // Configure connection
  const connection = new Connection(rpcEndpoint, {
    commitment,
    wsEndpoint: "wss://api.devnet.solana.com/",
  });

  // Create appropriate wallet based on mode
  const wallet = isViewOnly
    ? new Wallet(Keypair.generate()) // Dummy wallet for view-only mode
    : window.solana; // Real wallet for interactive mode

  // Configure provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment,
    preflightCommitment: commitment,
    skipPreflight: false,
  });

  // Initialize SDK for devnet
  const sdkConfig = initialize({ env: "devnet" });

  // Create client
  const client = new DriftClient({
    connection,
    wallet: provider.wallet,
    programID: sdkConfig.DRIFT_PROGRAM_ID,
    env: "devnet",
    opts: {
      commitment,
      preflightCommitment: commitment,
      skipPreflight: false,
    },
  });

  try {
    // Subscribe to updates
    await client.subscribe();

    if (!isViewOnly) {
      try {
        // Check SOL balance before proceeding
        const hasSufficientBalance = await checkSolBalance(
          connection,
          publicKey
        );
        if (!hasSufficientBalance) {
          throw new Error(
            `Insufficient SOL balance. Please get SOL from the Devnet faucet:\n` +
              `1. Copy your wallet address\n` +
              `2. Visit https://solfaucet.com\n` +
              `3. Paste your address and request SOL\n` +
              `4. Wait for the transaction to confirm\n` +
              `5. Try connecting again`
          );
        }

        // Only check for user account in interactive mode
        const userAccounts = await client.getUserAccountsForAuthority(
          publicKey
        );
        const hasExistingAccount = userAccounts && userAccounts.length > 0;

        if (!hasExistingAccount) {
          await client.initializeUserAccount();
        }
      } catch (error) {
        console.error("Error during user account initialization:", error);
        // In interactive mode, we want to surface initialization errors
        throw error instanceof Error
          ? error
          : new Error("Failed to initialize user account.");
      }
    }

    return client;
  } catch (error) {
    console.error("Error initializing Drift client:", error);
    throw error instanceof Error
      ? error
      : new Error(
          "Failed to initialize Drift client. Please check your connection and try again."
        );
  }
};
