import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./constants";

// Get provider and contract
export const getContract = async (withSigner = false) => {
  if (!window.ethereum) throw new Error("No wallet found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = withSigner ? await provider.getSigner() : undefined;
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer || provider);
};

// Call mint()
export const mintNFT = async () => {
    const contract = await getContract(true);
    const tx = await contract.mint({ value: ethers.parseEther("0.002") });
    return tx;
};  

// Read mintingEnabled from contract
export const getMintingStatus = async (): Promise<boolean> => {
  const contract = await getContract();
  return contract.mintingEnabled();
};

// Read total supply (number of minted tokens)
export const getTotalMinted = async (): Promise<number> => {
    const contract = await getContract();
    const total = await contract.totalSupply();
    return Number(total);
  };
  