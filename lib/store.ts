import { create } from 'zustand';
import { DriftClient } from '@drift-labs/sdk';
import { BN } from '@project-serum/anchor';

interface PerpPosition {
  marketIndex: number;
  baseAssetAmount: string;
  quoteAssetAmount: string;
  quoteEntryAmount: string;
  quoteBreakEvenAmount: string;
  settledPnl: string;
  openOrders: number;
  lpShares: string;
  openBids: string;
  openAsks: string;
}

interface UserAccount {
  authority: string;
  subAccountId: number;
  name: string;
  equity: number;
  totalCollateral: number;
  openOrders: number;
  openPositions: number;
  status: number;
  hasOpenOrder: boolean;
  isMarginTradingEnabled: boolean;
  perpPositions: PerpPosition[];
}

interface DriftStore {
  client: DriftClient | null;
  setClient: (client: DriftClient) => void;
  users: UserAccount[];
  setUsers: (users: UserAccount[]) => void;
  selectedUser: UserAccount | null;
  setSelectedUser: (user: UserAccount | null) => void;
}

export const useDriftStore = create<DriftStore>((set) => ({
  client: null,
  setClient: (client) => set({ client }),
  users: [],
  setUsers: (users) => set({ users }),
  selectedUser: null,
  setSelectedUser: (user) => set({ selectedUser: user }),
}));