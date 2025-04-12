"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDriftStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@project-serum/anchor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";

const USDC_MARKET_INDEX = 0; // USDC market index

export function DepositWithdrawForm({
  subAccountId,
  isViewOnly,
}: {
  subAccountId: number;
  isViewOnly?: boolean;
}) {
  const { client } = useDriftStore();
  const { connected } = useWallet();
  const [amount, setAmount] = useState("");
  const [action, setAction] = useState("deposit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (isViewOnly) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Wallet Access Required</h3>
          <p className="text-sm text-muted-foreground">
            You are viewing this account in read-only mode. To deposit or
            withdraw funds, you need to connect with the wallet that owns this
            account.
          </p>
        </div>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !connected) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Convert amount to USDC precision (6 decimals)
      const amountBN = new BN(parseFloat(amount) * 1e6);

      // Get the associated token account for USDC
      const associatedTokenAccount = await client.getAssociatedTokenAccount(
        USDC_MARKET_INDEX
      );

      if (!associatedTokenAccount) {
        throw new Error(
          "USDC token account not found. Please ensure you have USDC in your wallet."
        );
      }

      if (action === "deposit") {
        // Perform deposit using the correct method signature
        await client.deposit(
          amountBN,
          USDC_MARKET_INDEX,
          associatedTokenAccount
        );

        setSuccess(`Successfully deposited ${amount} USDC`);
      } else {
        // Perform withdrawal using the correct method signature
        await client.withdraw(
          amountBN,
          USDC_MARKET_INDEX,
          associatedTokenAccount
        );

        setSuccess(`Successfully withdrew ${amount} USDC`);
      }

      setAmount("");
    } catch (err) {
      console.error("Transaction error:", err);
      let errorMessage =
        err instanceof Error ? err.message : "Transaction failed";

      // Add helpful context for common errors
      if (errorMessage.includes("0x1")) {
        errorMessage = "Insufficient USDC balance in wallet";
      } else if (errorMessage.includes("associated token account")) {
        errorMessage =
          "USDC token account not found. Please ensure you have USDC in your wallet.";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage =
          action === "withdraw"
            ? "Insufficient funds in your Drift account"
            : "Insufficient USDC in your wallet";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdraw">Withdraw</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Amount (USDC)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="0.1"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!amount || loading || !connected}
        >
          {loading
            ? "Processing..."
            : action === "deposit"
            ? "Deposit"
            : "Withdraw"}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </form>
    </Card>
  );
}
