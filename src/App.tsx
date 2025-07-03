import React, { useEffect, useState } from "react";
import { CONTRACT_ADDRESS } from "./constants";
import { mintNFT, getMintingStatus, getTotalMinted } from "./logic";
import { Toaster, toast } from "sonner";

import "./App.css";

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [mintingEnabled, setMintingEnabled] = useState<boolean | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkOk, setNetworkOk] = useState<boolean>(false);
  const [totalMinted, setTotalMinted] = useState<number>(0);

  useEffect(() => {
    getMintingStatus()
      .then(setMintingEnabled)
      .catch(() => setMintingEnabled(null));

    getTotalMinted()
      .then(setTotalMinted)
      .catch(() => setTotalMinted(0));

    checkNetwork();

    if (window.ethereum?.selectedAddress) {
      setWalletAddress(window.ethereum.selectedAddress);
    }
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
  
      const tx = await mintNFT();
  
      const mintingToastId = toast.info("⏳ Minting in progress…", {
        duration: Infinity,
      });
  
      await tx.wait();
  
      toast.dismiss(mintingToastId);
      toast.success("✅ Mint successful!");
      getTotalMinted().then(setTotalMinted).catch(() => {});
    } catch (err: any) {
      toast.dismiss(); // dismiss any hanging messages
  
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

  return (
    <>
      <div id="title">
        <div>HashJing Mint</div>
        <div className="net-label">TestNet</div>
      </div>

      <main id="mandala-section">
        <div className="section-title">Mint your unique mandala</div>
        <p className="status">
          Each token is fully on-chain and costs 0.002 ETH to mint.
        </p>

        {!walletAddress ? (
          <button className="wide-button" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <p className="status">
            Connected: {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}{" "}
            ({networkOk ? "Sepolia ✅" : "Wrong network ❌"})
          </p>
        )}

        {/* Button — changes text and state based on minting status */}
        <button
          className={`wide-button green-button ${(!walletAddress || !networkOk || mintingEnabled === false) ? "disabled" : ""}`}
          onClick={handleMint}
          disabled={!walletAddress || !networkOk || mintingEnabled === false}
        >
          {mintingEnabled === false
            ? "Minting disabled ❌"
            : "Mint now"}
        </button>

        <div className="status">
          <p>Status: {totalMinted} / 8192 minted</p>
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
        <Toaster position="bottom-center" richColors />
      </main>
    </>
  );
}

export default App;
