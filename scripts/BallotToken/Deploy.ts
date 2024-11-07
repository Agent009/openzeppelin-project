import { viem } from "hardhat";
import { formatEther } from "viem";
import { publicClientFor } from "@scripts/utils";

async function main() {
  const publicClient = await publicClientFor();
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> Deploy -> last block number", blockNumber);
  const [deployer] = await viem.getWalletClients();
  console.log("scripts -> Deploy -> deployer address", deployer!.account.address);
  const balance = await publicClient.getBalance({
    address: deployer!.account.address,
  });
  console.log(
    "scripts -> Deploy -> deployer balance",
    formatEther(balance),
    deployer!.chain.nativeCurrency.symbol
  );

  console.log("\nscripts -> Deploy -> deploying BallotToken contract");
  const tokenContract = await viem.deployContract("BallotToken");
  console.log("scripts -> Deploy -> BallotToken contract deployed to", tokenContract.address);

  const totalSupply = await tokenContract.read.totalSupply();
  console.log("scripts -> Deploy -> totalSupply", { totalSupply });
}

main().catch((error) => {
  console.log("\n\nError details:");
  console.error(error);
  process.exitCode = 1;
});
