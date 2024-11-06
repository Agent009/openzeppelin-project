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
  const minterRole = await token.read.MINTER_ROLE();
  const grantMinterRoleTokenTx = await token.write.grantRole([minterRole, contract.address]);
  await publicClient.waitForTransactionReceipt({
    hash: grantMinterRoleTokenTx,
  });
  console.log("TokenSale -> deployContracts -> contract", contract.address, "token", token.address, "nft", nft.address);
  return {publicClient, deployer, deployerAddress, account2, account3, account2Address, contract, token, nft};
};

const buyTokensFixture = async (publicClient: PublicClient, buyer: WalletClient, amount: bigint) => {
  const { contract, token } = await loadFixture(deployContracts);
  const buyerAccount = buyer.account;
  const buyerAddress = buyer.account.address;
  const balanceBefore = await publicClient.getBalance(buyerAccount);
  // const tokenAmount = amount * DEFAULT_RATIO;
  console.log("TokenSale -> buyTokens -> supply", await token.read.totalSupply());
  console.log("TokenSale -> buyTokens -> buyer", buyerAddress, "balance", balanceBefore, "tokens", await token.read.balanceOf([buyerAddress]));
  // Transfer tokens to the TokenSale contract
  // await token.write.transfer([contract.address, tokenAmount]);
  // expect(await token.read.balanceOf([contract.address])).to.equal(tokenAmount);
  // Buy tokens from the TokenSale contract
  // const buyerContract = await viem.getContractAt(CONTRACT_NAME, contract.address, { client: { wallet: buyer }});
  // console.log("TokenSale -> buyTokens -> buyerContract", buyerContract.address);
  const txHash = await contract.write.buyTokens({value: amount, account: buyer.account});
  const receipt = await publicClient.getTransactionReceipt({hash: txHash});
  expect(receipt.status).to.equal("success");
  expect(await token.read.balanceOf([contract.address])).to.equal(0n);
  const totalCost = receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  const balanceAfter = await publicClient.getBalance(buyerAccount);
  const diff = balanceBefore - balanceAfter;

  return {
    balanceBefore,
    totalCost,
    balanceAfter,
    diff,
    tokens: await token.read.balanceOf([buyerAddress])
  };
};

const returnTokensFixture = async (publicClient: PublicClient, user: WalletClient, amount: bigint) => {
  const { contract, token } = await loadFixture(deployContracts);
  const userAccount = user.account;
  const userAddress = user.account.address;
  // First, let's buy the tokens.
  const { balanceAfter: balanceBefore, tokens: tokensBefore } = await buyTokensFixture(publicClient, user!, amount / DEFAULT_RATIO);
  // Now, let's burn the bought tokens.
  // const userContract = await viem.getContractAt(CONTRACT_NAME, contract.address, { client: { wallet: user }});
  // console.log("TokenSale -> returnTokens -> userContract", userContract.address, "balance", balanceBefore, "tokens", tokensBefore);
  // First, we need to approve the burn.
  let txHash = await token.write.approve([contract.address, amount], { account: user.account });
  let receipt = await publicClient.getTransactionReceipt({hash: txHash});
  let totalCost = receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  // Now, we can go ahead with the burn.
  console.log("TokenSale -> returnTokens -> balance", balanceBefore, "tokens", tokensBefore);
  txHash = await contract.write.returnTokens([amount], { account: user.account });
  receipt = await publicClient.getTransactionReceipt({hash: txHash});
  expect(receipt.status).to.equal("success");
  totalCost += receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n;
  const balanceAfter = await publicClient.getBalance(userAccount);
  const diff = balanceAfter - balanceBefore;

  return {
    balanceBefore,
    totalCost,
    balanceAfter,
    diff,
    tokensBefore,
    tokensAfter: await token.read.balanceOf([userAddress])
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
      expect(symbol).to.eq("TK");
    });
  })
  describe("When a user buys an ERC20 from the Token contract", async () => {
    const TEST_ETH_PAYMENT_SIZE = parseEther("0.01");

    it("charges the correct amount of ETH", async () => {
      const { publicClient, account2 } = await loadFixture(deployContracts);
      const { totalCost, balanceAfter, diff, tokens } = await buyTokensFixture(publicClient, account2!, TEST_ETH_PAYMENT_SIZE);
      console.log("TokenSale -> buyTokens -> totalCost", totalCost, "balanceAfter", balanceAfter, "diff", diff, "tokens", tokens);
      expect(diff).to.eq(TEST_ETH_PAYMENT_SIZE + totalCost);
    })
    it("gives the correct amount of tokens", async () => {
      const { publicClient, account2 } = await loadFixture(deployContracts);
      const { totalCost, balanceAfter, diff, tokens } = await buyTokensFixture(publicClient, account2!, TEST_ETH_PAYMENT_SIZE);
      console.log("TokenSale -> buyTokens -> totalCost", totalCost, "balanceAfter", balanceAfter, "diff", diff, "tokens", tokens);
      expect(tokens).to.eq(TEST_ETH_PAYMENT_SIZE * DEFAULT_RATIO);
    });
  })
  describe("When a user burns an ERC20 at the Sale contract", async () => {
    const TEST_TOKENS_AMOUNT = parseEther("0.01") * DEFAULT_RATIO;

    it("gives the correct amount of ETH", async () => {
      const { publicClient, account2 } = await loadFixture(deployContracts);
      const { totalCost, balanceAfter, diff, tokensAfter } = await returnTokensFixture(publicClient, account2!, TEST_TOKENS_AMOUNT);
      console.log("TokenSale -> burn -> totalCost", totalCost, "balanceAfter", balanceAfter, "diff", diff, "tokens", tokensAfter);
      const expectedBalance = (TEST_TOKENS_AMOUNT / DEFAULT_RATIO) - totalCost;
      expect(diff).to.eq(expectedBalance);
    })
    it("burns the correct amount of tokens", async () => {
      const { publicClient, account2 } = await loadFixture(deployContracts);
      const { totalCost, balanceAfter, diff, tokensAfter } = await returnTokensFixture(publicClient, account2!, TEST_TOKENS_AMOUNT);
      console.log("TokenSale -> burn -> totalCost", totalCost, "balanceAfter", balanceAfter, "diff", diff, "tokens", tokensAfter);
      expect(tokensAfter).to.eq(0n);
    });
  })
  describe("When a user buys an NFT from the Sale contract", async () => {
    it("charges the correct amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    })
    it("gives the correct NFT", async () => {
      throw new Error("Not implemented");
    });
  })
  describe("When a user burns their NFT at the Sale contract", async () => {
    it("gives the correct amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    });
  })
  describe("When the owner withdraws from the Sale contract", async () => {
    it("recovers the right amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    })
    it("updates the owner pool account correctly", async () => {
      throw new Error("Not implemented");
    });
  });
});
