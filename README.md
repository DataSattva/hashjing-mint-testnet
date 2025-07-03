# HashJing Mint | TestNet

Minimal React + TypeScript interface for minting **HashJing** NFTs on the Sepolia testnet.

HashJing is a fully on-chain generative system where cryptographic entropy is rendered as a circular glyph—a mandala of 64 sectors and 4 rings—directly inside the EVM.

This interface allows users to connect a wallet, verify the network, and mint testnet tokens. The output SVGs are generated entirely on-chain and require no external server.

> **Note:** This is a testnet-only deployment. Tokens minted here are not part of the canonical collection and hold no value. Mainnet deployment will be announced separately.

## Features

- Wallet connect and network check (MetaMask-compatible)
- On-chain minting via the HashJingNFT contract
- Contract status (minting enabled, total minted)
- Responsive layout based on legacy HTML/CSS template
- No external dependencies beyond `ethers.js` and `sonner`

## Repositories

- Smart contracts: [hashjing-nft](https://github.com/DataSattva/hashjing-nft)
- Full project and renderer logic: [hashjing](https://github.com/DataSattva/hashjing)

## License

MIT for code.  
Visual assets and concepts © 2025 [DataSattva](https://github.com/DataSattva), some rights reserved.