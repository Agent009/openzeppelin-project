import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi, bytecode } from "@artifacts/contracts/MyToken.sol/MyToken.json";
import { constants } from "@lib/constants";


async function main() {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(constants.integrations.alchemy.sepolia),
  });
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> DeployWithViem -> last block number", blockNumber);

  // Create a wallet client
  const deployer = createWalletClient({
    account: privateKeyToAccount(`0x${constants.account.deployerPrivateKey}`),
    chain: sepolia,
    transport: http(constants.integrations.alchemy.sepolia),
  });
  console.log("scripts -> DeployWithViem -> deployer address", deployer.account.address);
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(
    "scripts -> DeployWithViem -> deployer balance",
    formatEther(balance),
    deployer.chain.nativeCurrency.symbol
  );

  // Deploy contract
  console.log("\nscripts -> DeployWithViem -> deploying MyToken contract");
  const hash = await deployer.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
    args: [],
  });
  console.log("scripts -> DeployWithViem -> transaction hash", hash, "waiting for confirmations...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("scripts -> DeployWithViem -> myToken contract deployed to", receipt.contractAddress);
  const gasPrice = receipt.effectiveGasPrice ? formatEther(receipt.effectiveGasPrice) : "N/A";
  const gasUsed = receipt.gasUsed ? receipt.gasUsed.toString() : "N/A";
  const totalCost = receipt.effectiveGasPrice ? formatEther(receipt.effectiveGasPrice * receipt.gasUsed) : "N/A";
  console.log("scripts -> DeployWithViem -> transaction confirmed -> receipt", receipt.blockNumber);
  console.log("scripts -> DeployWithViem -> gas -> price", gasPrice, "used", gasUsed, "totalCost", totalCost);
}

main().catch((error) => {
  console.log("\n\nError details:");
  console.error(error);
  process.exitCode = 1;
});
