"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { Buffer } from "buffer";
import { config } from "./config";
import type { AddKeySpec, DeleteKeySpec } from "./delegation";
import type { SignRequest } from "./nep413";
import type { TxSpec } from "./batch";
import type { FunctionCallSpec } from "./tx";
import { sendBatch, sendFunctionCall, sendKeyAction, signNep413, type CallResult, type SignOutcome } from "./wallet-calls";

export type { CallResult, SignOutcome };

interface WalletState {
  ready: boolean;
  initError: string | null;
  accountId: string | null;
  walletId: string | null;
  signIn: () => void;
  signOut: () => Promise<void>;
  call: (spec: FunctionCallSpec) => Promise<CallResult>;
  /** AddKey or DeleteKey on the signed-in account itself (needs the full-access key). */
  keyAction: (spec: AddKeySpec | DeleteKeySpec) => Promise<CallResult>;
  /** NEP-413 signature. `redirected` means the wallet left the page and the result comes back in the URL hash. */
  signMessage: (req: SignRequest) => Promise<SignOutcome>;
  /**
   * Several transactions behind one wallet approval (`signAndSendTransactions`). Wallets without it
   * get the same transactions one after another.
   */
  callBatch: (txs: TxSpec[]) => Promise<CallResult>;
}

const WalletContext = createContext<WalletState | null>(null);

const KEY_METHODS = ["join_round"];

export function WalletProvider({ children }: { children: ReactNode }) {
  const selectorRef = useRef<WalletSelector | null>(null);
  const modalRef = useRef<WalletSelectorModal | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(config.devFixtureAccount);
  const [walletId, setWalletId] = useState<string | null>(null);

  useEffect(() => {
    // Some wallet modules call the global Buffer, which Next does not provide in the browser.
    const g = globalThis as { Buffer?: typeof Buffer };
    g.Buffer ??= Buffer;
    let cancelled = false;
    const unsubscribe: Array<() => void> = [];

    async function init(): Promise<void> {
      try {
        const [core, ui, mnw, meteor, hot, intear] = await Promise.all([
          import("@near-wallet-selector/core"),
          import("@near-wallet-selector/modal-ui"),
          import("@near-wallet-selector/my-near-wallet"),
          import("@near-wallet-selector/meteor-wallet"),
          import("@near-wallet-selector/hot-wallet"),
          import("@near-wallet-selector/intear-wallet"),
        ]);
        const selector = await core.setupWalletSelector({
          network: config.network === "mainnet" ? "mainnet" : "testnet",
          modules: [mnw.setupMyNearWallet(), meteor.setupMeteorWallet(), hot.setupHotWallet(), intear.setupIntearWallet()],
          // The wallet creates exactly this restricted key: market contract, join_round only (RULES §4).
          createAccessKeyFor: { contractId: config.marketId, methodNames: KEY_METHODS },
        });
        const modal = ui.setupModal(selector, { contractId: config.marketId, methodNames: KEY_METHODS, theme: "light" });
        if (cancelled) return;
        selectorRef.current = selector;
        modalRef.current = modal;

        const sync = (): void => {
          const state = selector.store.getState();
          const active = state.accounts.find((a) => a.active) ?? state.accounts[0];
          setAccountId(config.devFixtureAccount ?? active?.accountId ?? null);
          setWalletId(state.selectedWalletId);
        };
        sync();
        const sub = selector.store.observable.subscribe(sync);
        unsubscribe.push(() => sub.unsubscribe());
        setReady(true);
      } catch (e) {
        if (!cancelled) setInitError(e instanceof Error ? e.message : "The wallet failed to load.");
      }
    }
    void init();
    return () => {
      cancelled = true;
      unsubscribe.forEach((fn) => fn());
    };
  }, []);

  const signIn = useCallback(() => modalRef.current?.show(), []);

  const signOut = useCallback(async () => {
    const selector = selectorRef.current;
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
  }, []);

  const call = useCallback((spec: FunctionCallSpec) => sendFunctionCall(selectorRef.current, accountId, spec), [accountId]);
  const keyAction = useCallback((spec: AddKeySpec | DeleteKeySpec) => sendKeyAction(selectorRef.current, accountId, spec), [accountId]);
  const callBatch = useCallback((txs: TxSpec[]) => sendBatch(selectorRef.current, accountId, txs), [accountId]);
  const signMessage = useCallback((req: SignRequest) => signNep413(selectorRef.current, accountId, req), [accountId]);

  const value = useMemo<WalletState>(
    () => ({ ready, initError, accountId, walletId, signIn, signOut, call, callBatch, keyAction, signMessage }),
    [ready, initError, accountId, walletId, signIn, signOut, call, callBatch, keyAction, signMessage],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
