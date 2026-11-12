"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { config } from "./config";
import { explainFailure, outcomeFailure, outcomeHash, type OutcomeLike } from "./outcome";
import type { FunctionCallSpec } from "./tx";

export interface CallResult {
  ok: boolean;
  hash: string | null;
  /** English message when `ok` is false. */
  error: string | null;
}

interface WalletState {
  ready: boolean;
  initError: string | null;
  accountId: string | null;
  walletId: string | null;
  signIn: () => void;
  signOut: () => Promise<void>;
  call: (spec: FunctionCallSpec) => Promise<CallResult>;
}

const WalletContext = createContext<WalletState | null>(null);

const KEY_METHODS = ["join_round"];

function errorMessage(e: unknown): string {
  if (e instanceof Error) return explainFailure(e.message);
  return "Terjadi kesalahan tak terduga.";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const selectorRef = useRef<WalletSelector | null>(null);
  const modalRef = useRef<WalletSelectorModal | null>(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);

  useEffect(() => {
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
          setAccountId(active?.accountId ?? null);
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

  const call = useCallback(async (spec: FunctionCallSpec): Promise<CallResult> => {
    const selector = selectorRef.current;
    if (!selector || !accountId) return { ok: false, hash: null, error: "Sign in with a NEAR wallet first." };
    try {
      const { actionCreators } = await import("@near-wallet-selector/core");
      const wallet = await selector.wallet();
      const outcome = (await wallet.signAndSendTransaction({
        signerId: accountId,
        receiverId: spec.receiverId,
        actions: [actionCreators.functionCall(spec.methodName, spec.args, BigInt(spec.gas), BigInt(spec.deposit))],
      })) as OutcomeLike | void;
      const failure = outcomeFailure(outcome ?? null);
      if (failure) return { ok: false, hash: outcomeHash(outcome ?? null), error: explainFailure(failure) };
      return { ok: true, hash: outcomeHash(outcome ?? null), error: null };
    } catch (e) {
      return { ok: false, hash: null, error: errorMessage(e) };
    }
  }, [accountId]);

  const value = useMemo<WalletState>(
    () => ({ ready, initError, accountId, walletId, signIn, signOut, call }),
    [ready, initError, accountId, walletId, signIn, signOut, call],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
