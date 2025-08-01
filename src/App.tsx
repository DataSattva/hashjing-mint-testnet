// src/App.tsx
import { useEffect, useState } from 'react'
import { useAccount, useChainId, useChains } from 'wagmi'
import { toast, Toaster } from 'sonner'

import { CONTRACTS, MINT_START_TIME, TOTAL_SUPPLY_CAP } from './constants'

import { useCountdown } from './hooks/useCountdown'
import { useMintingStatus } from './hooks/useMintingStatus'
import { useTotalMinted } from './hooks/useTotalMinted'
import { useOwnedTokens } from './hooks/useOwnedTokens'
import { useMint } from './hooks/useMint'

import { Header } from './components/Header'
import { Countdown } from './components/Countdown'
import { WalletInfo } from './components/WalletInfo'
import { StatusPanel } from './components/StatusPanel'
import { ContactBlock } from './components/ContactBlock'
import { MintedMandalas } from './components/MintedMandalas'
import { Button } from "@/components/ui/button"

/* ────────────────────────────────────────────────────────────────── */
/*  Constants & Chain Helpers                                        */
/* ────────────────────────────────────────────────────────────────── */

const getAddress = (id?: number) => (id && CONTRACTS[id]) || undefined

/* ────────────────────────────────────────────────────────────────── */
/*  Component                                                        */
/* ────────────────────────────────────────────────────────────────── */

export default function App() {
  // Wallet & Network Info
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const chains = useChains()
  const chain = chains.find(c => c.id === chainId)
  const networkOk = !!getAddress(chainId)

  // UI State
  const { now } = useCountdown(MINT_START_TIME)
  const mintingEnabled = useMintingStatus()
  const { totalMinted, refresh: refreshTotal } = useTotalMinted()

  const { tokens: ownedTokens, loading: ownedLoading } = useOwnedTokens()
  const [sessionTokens, setSessionTokens] = useState<any[]>([])   // minted this session
  const [waitToast, setWaitToast] = useState<string | number | null>(null)

  /* wipe session list when wallet disconnects or switches */
  useEffect(() => {
    if (!isConnected || !address) setSessionTokens([])
  }, [isConnected, address])

  // Show waiting toast before mint opens
  useEffect(() => {
    const afterStart = now >= MINT_START_TIME
    if (afterStart && mintingEnabled === false && !waitToast) {
      const id = toast('⏳ Waiting for network confirmation…', { duration: Infinity })
      setWaitToast(id)
    }
    if (mintingEnabled === true && waitToast) {
      toast.dismiss(waitToast)
      setWaitToast(null)
    }
  }, [now, mintingEnabled, waitToast])


  // Mint button handler
  const { mint: handleMint, busy: mintBusy } = useMint({
    onSuccess: meta => setSessionTokens(prev => [meta, ...prev]),
    onAfterSuccess: refreshTotal,
  })

  return (
    <>
      <Header chainName={chain?.name} />
      <Countdown now={now} startTime={MINT_START_TIME} mintingEnabled={mintingEnabled} />
      <main className="mx-auto max-w-screen-md px-4 space-y-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Mint your unique mandala
          </h2>
          <div className="space-y-4 text-base leading-relaxed">
            <p className="status">Each token is fully on-chain and costs 0.002 ETH.</p>

            <WalletInfo
              isConnected={isConnected}
              address={address}
              chainName={chain?.name}
              networkOk={networkOk}
            />

            <Button
              className="rounded-none w-full py-7 text-base font-semibold bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              disabled={
                mintBusy || !isConnected || !networkOk ||
                mintingEnabled !== true ||
                (totalMinted !== null && totalMinted >= TOTAL_SUPPLY_CAP)
              }
              onClick={handleMint}
            >
              {totalMinted !== null && totalMinted >= TOTAL_SUPPLY_CAP
                ? 'Sold out ❌'
                : mintingEnabled === null
                ? 'Checking status…'
                : mintingEnabled === false
                ? 'Mint disabled ❌'
                : 'Mint now'}
            </Button>
          </div>
          

          <StatusPanel
            totalMinted={totalMinted}
            totalCap={TOTAL_SUPPLY_CAP}
            priceLabel="0.002 ETH + gas"
            networkOk={networkOk}
            contractUrl={
              networkOk
                ? `https://${chain?.testnet ? 'sepolia.' : ''}etherscan.io/address/${getAddress(chainId)}`
                : undefined
            }
            contractShort={getAddress(chainId)?.slice(0, 6) + '…' + getAddress(chainId)?.slice(-4)}
          />

        <MintedMandalas
          tokens={[...sessionTokens, ...ownedTokens]}
          loading={ownedLoading}
        />
        <ContactBlock />
        <Toaster position="bottom-center" richColors />
      </main>
    </>
  )
}
