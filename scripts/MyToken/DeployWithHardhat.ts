import { viem } from "hardhat";
import { formatEther } from "viem";
import { publicClientFor } from "@scripts/utils";

async function main() {
  const publicClient = await publicClientFor();
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> DeployWithHardhat -> last block number", blockNumber);
  const [deployer] = await viem.getWalletClients();
  console.log("scripts -> DeployWithHardhat -> deployer address", deployer!.account.address);
  const balance = await publicClient.getBalance({
    address: deployer!.account.address,
  });
  console.log(
    "scripts -> DeployWithHardhat -> deployer balance",
    formatEther(balance),
    deployer!.chain.nativeCurrency.symbol
  );

  console.log("\nscripts -> DeployWithHardhat -> deploying MyToken contract");
  const tokenContract = await viem.deployContract("MyToken");
  console.log("scripts -> DeployWithHardhat -> MyToken contract deployed to", tokenContract.address);

  const totalSupply = await tokenContract.read.totalSupply();
  console.log("scripts -> DeployWithHardhat -> totalSupply", { totalSupply });
}

main().catch((error) => {
  console.log("\n\nError details:");
  console.error(error);
  process.exitCode = 1;
});
