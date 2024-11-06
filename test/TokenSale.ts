import { expect } from "chai";
import { viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { PublicClient } from "@nomicfoundation/hardhat-viem/src/types";
import { parseEther } from "viem";
import { WalletClient } from "@node_modules/@nomicfoundation/hardhat-viem/src/types.ts";

const CONTRACT_NAME = "TokenSale";
const TOKEN_CONTRACT_NAME = "MyToken";
const NFT_CONTRACT_NAME = "MyNFT";
const DEFAULT_RATIO = 100n;
const DEFAULT_PRICE = 10n;
const TOKEN_TOTAL_SUPPLY = 10n * 10n ** 18n;
const MINTER_ROLE_CODE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

const deployContracts = async () => {
  const publicClient: PublicClient = await viem.getPublicClient();
  const [deployer, account2, account3] = await viem.getWalletClients();
  const deployerAddress = deployer!.account.address;
  const account2Address = account2!.account.address;
  const token = await viem.deployContract(TOKEN_CONTRACT_NAME, [], { client: { public: publicClient, wallet: deployer }});
  const nft = await viem.deployContract(NFT_CONTRACT_NAME, [], { client: { public: publicClient, wallet: deployer }});
  const contract = await viem.deployContract(CONTRACT_NAME, [ DEFAULT_RATIO, DEFAULT_PRICE, token.address, nft.address ], {
    client: {
      public: publicClient,
      wallet: deployer
    }
  });
  // const minterRole = await token.read.MINTER_ROLE();
  const grantMinterRoleTokenTx = await token.write.grantRole([MINTER_ROLE_CODE, contract.address]);
  await publicClient.waitForTransactionReceipt({
    hash: grantMinterRoleTokenTx,
  });
  const grantMinterRoleNftTx = await nft.write.grantRole([MINTER_ROLE_CODE, contract.address]);
  await publicClient.waitForTransactionReceipt({
    hash: grantMinterRoleNftTx,
  });
  console.log("TokenSale -> deployContracts -> contract", contract.address, "token", token.address, "nft", nft.address);
  return {publicClient, deployer, deployerAddress, account2, account3, account2Address, contract, token, nft};
};

const buyTokensFixture = async (publicClient: PublicClient, contract: any, token: any, buyer: WalletClient, amount: bigint) => {
  const buyerAccount = buyer.account;
  const buyerAddress = buyer.account.address;
  const balanceBefore = await publicClient.getBalance(buyerAccount);
  // const tokenAmount = amount * DEFAULT_RATIO;
  console.log("TokenSale -> buyTokens -> token supply", await token.read.totalSupply());
  console.log("TokenSale -> buyTokens -> buyer", buyerAddress, "balanceBefore", balanceBefore, "tokensBefore", await token.read.balanceOf([buyerAddress]));
  // Transfer tokens to the TokenSale contract
  // await token.write.transfer([contract.address, tokenAmount]);
  // expect(await token.read.balanceOf([contract.address])).to.equal(tokenAmount);
  // Buy tokens from the TokenSale contract
  // const buyerContract = await viem.getContractAt(CONTRACT_NAME, contract.address, { client: { wallet: buyer }});
  // console.log("TokenSale -> buyTokens -> buyerContract", buyerContract.address);
  const txHash = await contract.write.buyTokens({value: amount, account: buyer.account});
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  expect(receipt.status).to.equal("success");
  expect(await token.read.balanceOf([contract.address])).to.equal(0n);
  const totalCost = receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  const balanceAfter = await publicClient.getBalance(buyerAccount);
  const diff = balanceBefore - balanceAfter;
  const tokens = await token.read.balanceOf([buyerAddress]);
  console.log("TokenSale -> buyTokens -> totalCost", totalCost, "balanceAfter", balanceAfter, "diff", diff, "tokensAfter", tokens);

  return {
    balanceBefore,
    totalCost,
    balanceAfter,
    diff,
    tokens
  };
};

const returnTokensFixture = async (publicClient: PublicClient, contract: any, token: any, user: WalletClient, amount: bigint) => {
  const userAccount = user.account;
  const userAddress = user.account.address;
  // First, let's buy the tokens.
  const { balanceAfter: balanceBefore, tokens: tokensBefore } = await buyTokensFixture(publicClient, contract, token, user!, amount / DEFAULT_RATIO);
  // Now, let's burn the bought tokens.
  // const userContract = await viem.getContractAt(CONTRACT_NAME, contract.address, { client: { wallet: user }});
  // console.log("TokenSale -> returnTokens -> userContract", userContract.address);
  // First, we need to approve the burn.
  let txHash = await token.write.approve([contract.address, amount], { account: user.account });
  let receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  let totalCost = receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  console.log("TokenSale -> returnTokens -> approval", receipt.status, "totalCost", totalCost);
  // Now, we can go ahead with the burn.
  txHash = await contract.write.returnTokens([amount], { account: user.account });
  receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  expect(receipt.status).to.equal("success");
  totalCost += receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  const balanceAfter = await publicClient.getBalance(userAccount);
  const diff = balanceAfter - balanceBefore;
  const tokensAfter = await token.read.balanceOf([userAddress]);
  console.log("TokenSale -> returnTokens -> totalCost", totalCost, "balanceAfter", balanceAfter, "diff", diff, "tokensAfter", tokensAfter);

  return {
    balanceBefore,
    totalCost,
    balanceAfter,
    diff,
    tokensBefore,
    tokensAfter
  };
};

const mintNFTFixture = async (publicClient: PublicClient, contract: any, token: any, user: WalletClient, tokens: bigint, tokenId: bigint) => {
  const userAccount = user.account;
  const userAddress = user.account.address;
  // First, we need to approve the tokens that are going to be spent on the mint.
  let txHash = await token.write.approve([contract.address, tokens], { account: user.account });
  let receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  let totalCost = receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  // Now, we can go ahead with the mint.
  console.log("TokenSale -> mintNFT -> approval", receipt.status, "totalCost", totalCost);
  txHash = await contract.write.mintNFT([tokenId], { account: user.account });
  receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  expect(receipt.status).to.equal("success");
  totalCost += receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  const balanceAfter = await publicClient.getBalance(userAccount);

  return {
    totalCost,
    balanceAfter,
    tokensAfter: await token.read.balanceOf([userAddress])
  };
};

const burnNFTFixture = async (publicClient: PublicClient, contract: any, nft: any, user: WalletClient, tokenId: bigint) => {
  const userAccount = user.account;
  // First, we need to approve the sale contract to operate on the token of interest.
  let txHash = await nft.write.approve([contract.address, tokenId], { account: user.account });
  let receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  let totalCost = receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  // Now, we can go ahead with the mint.
  console.log("TokenSale -> burnNFT -> approval", receipt.status, "totalCost", totalCost);
  txHash = await contract.write.burnNFT([tokenId], { account: user.account });
  receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  expect(receipt.status).to.equal("success");
  totalCost += receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  const balanceAfter = await publicClient.getBalance(userAccount);

  return {
    totalCost,
    balanceAfter,
  };
};

const withdrawTokensFixture = async (publicClient: PublicClient, contract: any, token: any, user: WalletClient, amount: bigint) => {
  const userAccount = user.account;
  const userAddress = user.account.address;
  // First, we need to approve the sale contract to operate on the token of interest.
  let txHash = await token.write.approve([contract.address, amount], { account: user.account });
  let receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  let totalCost = receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  // Now, we can go ahead with the withdrawal.
  console.log("TokenSale -> withdrawTokens -> approval", receipt.status, "totalCost", totalCost);
  const tokensBefore = await token.read.balanceOf([userAddress]);
  txHash = await contract.write.withdrawTokens([amount]);
  receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  expect(receipt.status).to.equal("success");
  totalCost += receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  const balanceAfter = await publicClient.getBalance(userAccount);
  const tokensAfter = await token.read.balanceOf([userAddress]);
  const diff = tokensAfter - tokensBefore;
  console.log("TokenSale -> withdrawTokens -> totalCost", totalCost, "balanceAfter", balanceAfter, "tokensBefore", tokensBefore, "tokensAfter", tokensAfter, "diff", diff);

  return {
    totalCost,
    balanceAfter,
    tokensBefore,
    tokensAfter,
    diff
  };
};

describe(CONTRACT_NAME, async () => {
  describe("When the Sale contract is deployed", async () => {
    it("defines the ratio as provided in parameters", async () => {
      const {contract} = await loadFixture(deployContracts);
      const ratio = await contract.read.ratio();
      expect(ratio).to.eq(DEFAULT_RATIO);
    })
    it("defines the price as provided in parameters", async () => {
      const {contract} = await loadFixture(deployContracts);
      const price = await contract.read.price();
      expect(price).to.eq(DEFAULT_PRICE);
    });
    it("uses a valid ERC20 as payment token", async () => {
      const {contract} = await loadFixture(deployContracts);
      const tokenAddress = await contract.read.token() as `0x${string}`;
      const tokenContract = await viem.getContractAt(TOKEN_CONTRACT_NAME, tokenAddress);
      const totalSupply = await tokenContract.read.totalSupply();
      expect(totalSupply).to.eq(TOKEN_TOTAL_SUPPLY);
    });
    it("uses a valid ERC721 as NFT collection", async () => {
      const {contract} = await loadFixture(deployContracts);
      const nftAddress = await contract.read.nft() as `0x${string}`;
      const nftContract = await viem.getContractAt(NFT_CONTRACT_NAME, nftAddress);
      const symbol = await nftContract.read.symbol();
      expect(symbol).to.eq("NFT");
    });
  })
  describe("When a user buys an ERC20 from the Token contract", async () => {
    const TEST_ETH_PAYMENT_SIZE = parseEther("0.01");

    it("charges the correct amount of ETH", async () => {
      const { publicClient, contract, token, account2 } = await loadFixture(deployContracts);
      const { totalCost, diff } = await buyTokensFixture(publicClient, contract, token, account2!, TEST_ETH_PAYMENT_SIZE);
      expect(diff).to.eq(TEST_ETH_PAYMENT_SIZE + totalCost);
    })
    it("gives the correct amount of tokens", async () => {
      const { publicClient, contract, token, account2 } = await loadFixture(deployContracts);
      const { tokens } = await buyTokensFixture(publicClient, contract, token, account2!, TEST_ETH_PAYMENT_SIZE);
      expect(tokens).to.eq(TEST_ETH_PAYMENT_SIZE * DEFAULT_RATIO);
    });
  })
  describe("When a user burns an ERC20 at the Sale contract", async () => {
    const TEST_TOKENS_AMOUNT = parseEther("0.01") * DEFAULT_RATIO;

    it("gives the correct amount of ETH", async () => {
      const { publicClient, contract, token, account2 } = await loadFixture(deployContracts);
      const { totalCost, diff } = await returnTokensFixture(publicClient, contract, token, account2!, TEST_TOKENS_AMOUNT);
      const expectedBalance = (TEST_TOKENS_AMOUNT / DEFAULT_RATIO) - totalCost;
      expect(diff).to.eq(expectedBalance);
    })
    it("burns the correct amount of tokens", async () => {
      const { publicClient, contract, token, account2 } = await loadFixture(deployContracts);
      const { tokensAfter } = await returnTokensFixture(publicClient, contract, token, account2!, TEST_TOKENS_AMOUNT);
      expect(tokensAfter).to.eq(0n);
    });
  })
  describe("When a user buys an NFT from the Sale contract", async () => {
    const TEST_ETH_PAYMENT_SIZE = parseEther("0.01");
    const TEST_TOKENS_AMOUNT = TEST_ETH_PAYMENT_SIZE * DEFAULT_RATIO;
    const TOKEN_ID = 1n;

    it("charges the correct amount of ERC20 tokens", async () => {
      const { publicClient, contract, token, account2 } = await loadFixture(deployContracts);
      // Acquire tokens and get the user balance.
      const { balanceAfter: balanceBefore, tokens: tokensBefore } = await buyTokensFixture(publicClient, contract, token, account2!, TEST_ETH_PAYMENT_SIZE);
      // Buy the NFT and get the user tokens and balance.
      const { balanceAfter, tokensAfter } = await mintNFTFixture(publicClient, contract, token, account2!, TEST_TOKENS_AMOUNT, TOKEN_ID);
      console.log("TokenSale -> nft mint -> tokens check -> balanceBefore", balanceBefore, "balanceAfter", balanceAfter, "tokensBefore", tokensBefore, "tokensAfter", tokensAfter);
      // Check diff matches
      expect(tokensBefore).to.eq(TEST_TOKENS_AMOUNT);
      expect(tokensAfter).to.eq(TEST_TOKENS_AMOUNT - DEFAULT_PRICE);
    })
    it("gives the correct NFT", async () => {
      const { publicClient, contract, token, nft, account2 } = await loadFixture(deployContracts);
      // Acquire tokens
      await buyTokensFixture(publicClient, contract, token, account2!, TEST_ETH_PAYMENT_SIZE);
      // Buy the NFT
      await mintNFTFixture(publicClient, contract, token, account2!, TEST_TOKENS_AMOUNT, TOKEN_ID);
      // Verify ownership of NFT
      expect((await nft.read.ownerOf([TOKEN_ID])).toLowerCase()).to.equal(account2!.account.address);
    });
  })
  describe("When a user burns their NFT at the Sale contract", async () => {
    const TEST_ETH_PAYMENT_SIZE = parseEther("0.01");
    const TEST_TOKENS_AMOUNT = TEST_ETH_PAYMENT_SIZE * DEFAULT_RATIO;
    const TOKEN_ID = 1n;

    it("gives the correct amount of ERC20 tokens", async () => {
      const { publicClient, contract, token, nft, account2 } = await loadFixture(deployContracts);
      // Acquire tokens
      await buyTokensFixture(publicClient, contract, token, account2!, TEST_ETH_PAYMENT_SIZE);
      // Buy the NFT and get the tokens
      const { balanceAfter: balanceBefore, tokensAfter: tokensBefore } = await mintNFTFixture(publicClient, contract, token, account2!, TEST_TOKENS_AMOUNT, TOKEN_ID);
      // Burn the NFT and get the tokens
      const { balanceAfter } = await burnNFTFixture(publicClient, contract, nft, account2!, TOKEN_ID);
      const tokensAfter = await token.read.balanceOf([account2!.account.address]);
      const diff = tokensAfter - tokensBefore;
      console.log("TokenSale -> nft burn -> tokens check -> balanceBefore", balanceBefore, "balanceAfter", balanceAfter, "tokensBefore", tokensBefore, "tokensAfter", tokensAfter);
      // Ensure diff equals price / 2
      expect(diff).to.eq(DEFAULT_PRICE / 2n);
    });
  })
  describe("When the owner withdraws from the Sale contract", async () => {
    const TEST_ETH_PAYMENT_SIZE = parseEther("0.01");
    const TEST_TOKENS_AMOUNT = TEST_ETH_PAYMENT_SIZE * DEFAULT_RATIO;
    const TOKEN_ID = 1n;
    const WITHDRAW_AMOUNT = parseEther("0.01");

    it("recovers the right amount of ERC20 tokens", async () => {
      const { publicClient, contract, token, deployer, account2 } = await loadFixture(deployContracts);
      // Acquire tokens and buy an NFT with another account so that sales can build up in the sale contract.
      await buyTokensFixture(publicClient, contract, token, account2!, TEST_ETH_PAYMENT_SIZE);
      await mintNFTFixture(publicClient, contract, token, account2!, TEST_TOKENS_AMOUNT, TOKEN_ID);
      // Withdraw tokens.
      const { diff } = await withdrawTokensFixture(publicClient, contract, token, deployer!, WITHDRAW_AMOUNT);
      // Verify new tokens balance includes the withdrawn tokens.
      expect(diff).to.eq(WITHDRAW_AMOUNT > DEFAULT_PRICE ? DEFAULT_PRICE : WITHDRAW_AMOUNT);
    })
    it("updates the owner pool account correctly", async () => {
      const { publicClient, contract, token, deployer, account2 } = await loadFixture(deployContracts);
      // Acquire tokens and buy an NFT with another account so that sales can build up in the sale contract.
      await buyTokensFixture(publicClient, contract, token, account2!, TEST_ETH_PAYMENT_SIZE);
      await mintNFTFixture(publicClient, contract, token, account2!, TEST_TOKENS_AMOUNT, TOKEN_ID);
      // Withdraw tokens.
      const { tokensBefore, tokensAfter } = await withdrawTokensFixture(publicClient, contract, token, deployer!, WITHDRAW_AMOUNT);
      // Verify new tokens balance includes the withdrawn tokens.
      expect(tokensAfter).to.eq(tokensBefore + (WITHDRAW_AMOUNT > DEFAULT_PRICE ? DEFAULT_PRICE : WITHDRAW_AMOUNT));
    });
  });
});
