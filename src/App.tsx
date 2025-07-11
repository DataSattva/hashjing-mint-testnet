import React, { useEffect, useState } from "react";
import { CONTRACT_ADDRESS } from "./constants";
import { mintNFT, getMintingStatus, getTotalMinted, getTokenURI} from "./logic";
import { Toaster, toast } from "sonner";

import "./App.css";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Mint start time (UTC)
const MINT_START_TIME = new Date("2025-07-07T13:12:00Z");
const TOTAL_MINTED = 8192;

function App() {
  //const [mintingEnabled, setMintingEnabled] = useState<boolean>(false);
  const [mintingEnabled, setMintingEnabled] = useState<boolean | null>(null);

  const [mintedTokens, setMintedTokens] = useState<
    {
      name: string;
      description: string;
      image: string;
      attributes: { trait_type: string; value: string | number }[];
    }[]
  >([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkOk, setNetworkOk] = useState<boolean>(false);
  const [totalMinted, setTotalMinted] = useState<number | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [waitingToastId, setWaitingToastId] = useState<string | number | null>(null);

  // toast: show only after countdown + explicit contract status = false
  useEffect(() => {
    const afterStart = now >= MINT_START_TIME;

    // show toast once when mintingEnabled is explicitly false
    if (afterStart && mintingEnabled === false && !waitingToastId) {
      const id = toast("⏳ Waiting for network confirmation…", {
        duration: Infinity,
      });
      setWaitingToastId(id);
    }

    // dismiss toast as soon as mint opens
    if (mintingEnabled === true && waitingToastId) {
      toast.dismiss(waitingToastId);
      setWaitingToastId(null);
    }
  }, [now, mintingEnabled, waitingToastId]);

  // Fetch total minted once on mount
  useEffect(() => {
    getTotalMinted()
      .then(setTotalMinted)
      .catch((err) => {
        console.error("Failed to fetch total minted:", err);
        setTotalMinted(0);
      });
  }, []);

  // Initial check + conditional polling
  useEffect(() => {
    let initialCheckDone = false;         // call contract once right after mount

    const interval = setInterval(() => {
      const current = new Date();
      setNow(current);

      const msToStart = MINT_START_TIME.getTime() - current.getTime();

      // call getMintingStatus():
      //  – always on first tick (initialCheckDone === false)
      //  – every second during the final 60 s before mint start
      if (!initialCheckDone || msToStart <= 60_000) {
        initialCheckDone = true;

        console.log("[debug] polling getMintingStatus()");
        getMintingStatus()
          .then((enabled) => {
            console.log("[debug] getMintingStatus() =>", enabled);
            if (enabled) {
              setMintingEnabled(true);
              clearInterval(interval);    // stop polling when mint is open
              console.log("[debug] Minting enabled — polling stopped");
            } else {
              setMintingEnabled(false);
            }
          })
          .catch((err) => {
            console.log(
              "[debug] getMintingStatus() failed — fallback to true:",
              err
            );
            setMintingEnabled(true);
            clearInterval(interval);      // stop polling on fallback
            console.log("[debug] Minting assumed enabled — polling stopped");
          });
      }
    }, 1000);

    return () => clearInterval(interval); // cleanup on unmount
  }, []);



  const checkNetwork = async () => {
    if (!window.ethereum) return;
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    setNetworkOk(chainId === "0xaa36a7"); // Sepolia
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("❌ No wallet found");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);
      checkNetwork();
      toast.success("✅ Wallet connected");
    } catch (err: any) {
      toast.error("❌ Wallet connection failed");
    }
  };

  const handleMint = async () => {
    if (!walletAddress) {
      toast.error("❌ Connect your wallet first.");
      return;
    }

    if (!networkOk) {
      toast.error("❌ Switch to Sepolia network.");
      return;
    }

    try {
      toast.info("🦊 Please confirm the transaction in your wallet…");

      // Prevent minting if max supply is reached
      if (totalMinted !== null && totalMinted >= TOTAL_MINTED) {
        toast.error("❌ Max supply reached. Minting disabled.");
        return;
      }      

      const tx = await mintNFT();

      const mintingToastId = toast.info("⏳ Minting in progress…", {
        duration: Infinity,
      });

      await tx.wait();

      // Dismiss progress message and show success
      toast.dismiss(mintingToastId);
      toast.success("✅ Mint successful!");

      // Update total minted counter
      const newTotal = await getTotalMinted();
      setTotalMinted(newTotal);

      // Fetch tokenURI for the newly minted token (IDs start from 1)
      try {
        const metadata = await getTokenURI(newTotal);
        setMintedTokens((prev) => [metadata, ...prev]); // prepend new token
      } catch (err) {
        console.error("Failed to fetch tokenURI", err);
      }      
    } catch (err: any) {
      toast.dismiss();

      const message = err?.message || "";
      if (message.includes("user rejected")) {
        toast.info("⚠️ Transaction cancelled by user.");
      } else if (message.includes("insufficient funds")) {
        toast.error("❌ Not enough ETH to mint.");
      } else if (message.includes("minting disabled")) {
        toast.error("❌ Minting is currently disabled.");
      } else if (message.includes("max supply") || message.includes("sold out")) {
        toast.error("❌ Minting finished. Supply sold out.");
      } else {
        toast.error(`❌ Unexpected error: ${message}`);
      }
    }
  };

  // Format remaining time as hh:mm:ss
  const formatCountdown = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    const dayPart = days > 0 ? `${days} days ` : "";
  
    return `${dayPart}${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };  

  return (
    <>
      <div id="title">
        <div>HashJing Mint</div>
        <div className="net-label">TestNet</div>
      </div>

      {now < MINT_START_TIME && mintingEnabled !== true && (
        <div className="status">
          <p>
            Mint starts at {MINT_START_TIME.toUTCString().slice(5, 22)} UTC
          </p>
          <p>
            Available in <strong>{formatCountdown(MINT_START_TIME.getTime() - now.getTime())}</strong>
          </p>
        </div>
      )}


      <main id="mandala-section">
        <div className="section-title">Mint your unique mandala</div>
        <p className="status">
          Each token is fully on-chain and costs 0.002 ETH to mint.
        </p>

        <div className="status">
          {!walletAddress ? (
            <button className="small-button" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <p className="status">
              Connected: {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}{" "}
              ({networkOk ? "Sepolia ✅" : "Wrong network ❌"})
            </p>
          )}
        </div>

        <button
          className={`wide-button green-button ${
            !walletAddress || !networkOk || mintingEnabled !== true ? "disabled" : ""
          }`}
          onClick={handleMint}
          disabled={
            !walletAddress ||
            !networkOk ||
            mintingEnabled !== true ||                         // ← was === false
            (totalMinted !== null && totalMinted >= TOTAL_MINTED)
          }
        >
          {totalMinted !== null && totalMinted >= TOTAL_MINTED
            ? "Sold out ❌"
            : mintingEnabled === null                          // new state: still checking
            ? "Checking status…"
            : mintingEnabled === false
            ? "Minting disabled ❌"
            : "Mint now"}
        </button>

        <div className="status">
          <p>Status: {totalMinted !== null ? `${totalMinted} / ${TOTAL_MINTED} minted` : `__ / ${TOTAL_MINTED} minted`}</p>
          <p>
            <button
              className="small-button"
              onClick={() => {
                getTotalMinted()
                  .then((updated) => {
                    setTotalMinted(updated);
                    toast.success("✅ Status updated");
                  })
                  .catch((err) => {
                    console.error("Failed to refresh total minted:", err);
                    toast.error("⚠️ Failed to update status.");
                  });
              }}
            >
              🔄 Refresh status
            </button>
          </p>
          <p>Price: 0.002 ETH + gas</p>
          <p>
            Contract:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {CONTRACT_ADDRESS.slice(0, 6)}…{CONTRACT_ADDRESS.slice(-4)}
            </a>
          </p>
          <p>Royalty: 7.5% to creator</p>
        </div>

        {mintedTokens.length > 0 && (
          <div id="preview-section">
            <h2 className="section-title">Your Minted Mandalas</h2>
            {mintedTokens.map((token, idx) => (
              <div key={idx} className="preview-container">
                <div
                  className="svg-preview"
                  dangerouslySetInnerHTML={{
                    __html: atob(token.image.split(",")[1]),
                  }}
                />
                <div className="traits">
                  <h3>{token.name}</h3>
                  <p>{token.description}</p>
                  <ul>
                    {token.attributes.map((attr) => (
                      <li key={attr.trait_type}>
                        <strong>{attr.trait_type}:</strong> {String(attr.value)}
                      </li>
                    ))}
                  </ul>
                  <p>
                    View on{" "}
                    <a
                      href={`https://testnets.opensea.io/assets/sepolia/${CONTRACT_ADDRESS}/${totalMinted}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      OpenSea
                    </a>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}


        <Toaster position="bottom-center" richColors />
      </main>
    </>
  );
}

export default App;