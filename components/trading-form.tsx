"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDriftStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";
import { BN } from "@project-serum/anchor";
import { PositionDirection, OrderType } from "@drift-labs/sdk";
import { useWallet } from "@solana/wallet-adapter-react";

const MARKETS = {
  "SOL-PERP": 0,
  "BTC-PERP": 1,
  "ETH-PERP": 2,
} as const;

const DEMO_MARKET_PRICES = {
  "SOL-PERP": {
    current: 123.45,
    bid: 123.4,
    ask: 123.5,
  },
  "BTC-PERP": {
    current: 67890.5,
    bid: 67885.0,
    ask: 67896.0,
  },
  "ETH-PERP": {
    current: 3456.78,
    bid: 3455.5,
    ask: 3458.0,
  },
};

export function TradingForm({
  isViewOnly,
  isDemo = true,
}: {
  isViewOnly?: boolean;
  isDemo?: boolean;
}) {
  const { client } = useDriftStore();
  const { connected } = useWallet();
  const [orderType, setOrderType] = useState("market");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [market, setMarket] = useState("SOL-PERP");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [advanced, setAdvanced] = useState(false);
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [useAuction, setUseAuction] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState("60");
  const [auctionStartPrice, setAuctionStartPrice] = useState("");
  const [auctionEndPrice, setAuctionEndPrice] = useState("");

  console.log("client", client);

  if (isViewOnly) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Wallet Access Required</h3>
          <p className="text-sm text-muted-foreground">
            You are viewing this account in read-only mode. To place trades, you
            need to connect with the wallet that owns this account.
          </p>
        </div>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!client || !connected) && !isDemo) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isDemo) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSuccess(
          `Successfully placed ${direction} ${orderType} order for ${size} ${market}`
        );
        setSize("");
        setPrice("");
        setTp("");
        setSl("");
        return;
      }

      const marketIndex = MARKETS[market as keyof typeof MARKETS];
      const baseAssetAmount = client.convertToPerpPrecision(parseFloat(size));
      const now = Math.floor(Date.now() / 1000);

      // Base order parameters
      const orderParams = {
        orderType: orderType === "market" ? OrderType.MARKET : OrderType.LIMIT,
        marketIndex,
        direction:
          direction === "long"
            ? PositionDirection.LONG
            : PositionDirection.SHORT,
        baseAssetAmount,
      } as any;

      // Add price for limit orders
      if (orderType === "limit") {
        orderParams.price = client.convertToPricePrecision(parseFloat(price));
      }

      // Add auction parameters if enabled
      if (useAuction && orderType === "market") {
        orderParams.auctionDuration = parseInt(auctionDuration);
        orderParams.auctionStartPrice = client.convertToPricePrecision(
          parseFloat(auctionStartPrice)
        );
        orderParams.auctionEndPrice = client.convertToPricePrecision(
          parseFloat(auctionEndPrice)
        );
        orderParams.maxTs = now + parseInt(auctionDuration) + 40; // Add buffer
      }

      // Place the main order
      await client.placePerpOrder(orderParams);

      // Place TP/SL orders if advanced mode is enabled
      if (advanced && (tp || sl)) {
        const oppositeDirection =
          direction === "long"
            ? PositionDirection.SHORT
            : PositionDirection.LONG;

        if (tp) {
          const tpPrice = client.convertToPricePrecision(parseFloat(tp));
          await client.placePerpOrder({
            orderType: OrderType.TRIGGER_MARKET,
            marketIndex,
            direction: oppositeDirection,
            baseAssetAmount,
            triggerPrice: tpPrice,
            triggerCondition: direction === "long" ? "above" : "below",
            reduceOnly: true,
          });
        }

        if (sl) {
          const slPrice = client.convertToPricePrecision(parseFloat(sl));
          await client.placePerpOrder({
            orderType: OrderType.TRIGGER_MARKET,
            marketIndex,
            direction: oppositeDirection,
            baseAssetAmount,
            triggerPrice: slPrice,
            triggerCondition: direction === "long" ? "below" : "above",
            reduceOnly: true,
          });
        }
      }

      setSuccess(
        `Successfully placed ${direction} ${orderType} order for ${size} ${market}`
      );
      setSize("");
      setPrice("");
      setTp("");
      setSl("");
      setAuctionStartPrice("");
      setAuctionEndPrice("");
    } catch (err) {
      console.error("Error placing order:", err);
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const currentMarketPrice =
    DEMO_MARKET_PRICES[market as keyof typeof DEMO_MARKET_PRICES].current;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Place Order</h3>
          {isDemo && (
            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">
              Demo Mode
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label>Market</Label>
          <Select value={market} onValueChange={setMarket}>
            <SelectTrigger>
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOL-PERP">SOL-PERP</SelectItem>
              <SelectItem value="BTC-PERP">BTC-PERP</SelectItem>
              <SelectItem value="ETH-PERP">ETH-PERP</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Current Price:</span>
            <span>${currentMarketPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Order Type</Label>
          <Select value={orderType} onValueChange={setOrderType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Size</Label>
          <Input
            type="number"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Enter size"
            min="0"
            step="0.01"
          />
          {size && (
            <div className="text-sm text-muted-foreground">
              Value: ${(parseFloat(size) * currentMarketPrice).toFixed(2)}
            </div>
          )}
        </div>

        {orderType === "limit" && (
          <div className="space-y-2">
            <Label>Price</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              min="0"
              step="0.01"
            />
          </div>
        )}

        {orderType === "market" && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label>Use Auction</Label>
              <Switch checked={useAuction} onCheckedChange={setUseAuction} />
            </div>

            {useAuction && (
              <>
                <div className="space-y-2">
                  <Label>Auction Duration (slots)</Label>
                  <Input
                    type="number"
                    value={auctionDuration}
                    onChange={(e) => setAuctionDuration(e.target.value)}
                    placeholder="Enter duration in slots"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Auction Start Price</Label>
                  <Input
                    type="number"
                    value={auctionStartPrice}
                    onChange={(e) => setAuctionStartPrice(e.target.value)}
                    placeholder="Enter start price"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Auction End Price</Label>
                  <Input
                    type="number"
                    value={auctionEndPrice}
                    onChange={(e) => setAuctionEndPrice(e.target.value)}
                    placeholder="Enter end price"
                    min="0"
                    step="0.01"
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Label>Advanced</Label>
          <Switch checked={advanced} onCheckedChange={setAdvanced} />
        </div>

        {advanced && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Take Profit</Label>
              <Input
                type="number"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                placeholder="Take profit price"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss</Label>
              <Input
                type="number"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                placeholder="Stop loss price"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1"
            variant={direction === "long" ? "default" : "outline"}
            onClick={() => setDirection("long")}
            disabled={
              (!connected && !isDemo) ||
              loading ||
              !size ||
              (orderType === "limit" && !price)
            }
          >
            {loading && direction === "long" ? "Processing..." : "Long"}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            variant={direction === "short" ? "destructive" : "outline"}
            onClick={() => setDirection("short")}
            disabled={
              (!connected && !isDemo) ||
              loading ||
              !size ||
              (orderType === "limit" && !price)
            }
          >
            {loading && direction === "short" ? "Processing..." : "Short"}
          </Button>
        </div>

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
