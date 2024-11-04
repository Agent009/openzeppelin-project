import { formatEther } from "viem";
import { sepolia } from "viem/chains";
import { abi, bytecode } from "@artifacts/contracts/MyToken.sol/MyToken.json";
import { deployerAccount, gasPrices, publicClientFor, walletClientFor } from "@scripts/utils";

async function main() {
  const publicClient = await publicClientFor(sepolia);
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> DeployWithViem -> last block number", blockNumber);

  // Create a wallet client
  const deployer = walletClientFor(deployerAccount);
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
  console.log("scripts -> DeployWithViem -> transaction confirmed -> receipt", receipt.blockNumber);
  gasPrices(receipt, "scripts -> DeployWithViem");
}

main().catch((error) => {
  console.log("\n\nError details:");
  console.error(error);
  process.exitCode = 1;
});
