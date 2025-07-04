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

  try {
    // Если метод есть — вызываем как обычно
    if (typeof contract.mintingEnabled === "function") {
      return await contract.mintingEnabled();
    }

    // Метод отсутствует — считаем, что минт всегда разрешён
    return true;
  } catch (err) {
    console.warn("mintingEnabled() not available or failed, fallback to TRUE");
    return true;
  }
};

// Read total supply (number of minted tokens)
export const getTotalMinted = async (): Promise<number> => {
    const contract = await getContract();
    const total = await contract.totalSupply();
    return Number(total);
  };
  
// Get full tokenURI metadata (base64 JSON)
export const getTokenURI = async (tokenId: number): Promise<any> => {
  const contract = await getContract();
  const uri: string = await contract.tokenURI(tokenId);

  // Remove "data:application/json;base64,"
  const base64 = uri.split(",")[1];
  const json = atob(base64);
  return JSON.parse(json);
};
