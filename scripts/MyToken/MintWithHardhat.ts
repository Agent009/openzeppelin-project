import {viem} from "hardhat";
import {formatEther, parseEther} from "viem";
import {sepolia} from "viem/chains";
import {contractName} from "@artifacts/contracts/MyToken.sol/MyToken.json";
import {
  checkAddress,
  checkParameters,
  deployerAccount,
  myTokenContractAddress,
  publicClientFor,
  walletClientFor
} from "@scripts/utils";

async function main() {
  const contractAddress = myTokenContractAddress;
  const [account1] = await viem.getWalletClients();
  const deployer = deployerAccount || account1;
  // Fetch parameters
  const ARG_TARGET_ADDRESS_IDX = 0;
  const ARG_AMOUNT_IDX = 1;
  const parameters = process.argv.slice(2);
  const targetAddress = parameters[ARG_TARGET_ADDRESS_IDX] as `0x${string}` || deployer.address;
  const mintAmount = parameters[ARG_AMOUNT_IDX] as unknown as bigint || parseEther("10");
  checkParameters(parameters, 2, "You must at least provide the target address.");
  checkAddress("contract", contractAddress);
  checkAddress("target", targetAddress);
  console.log("scripts -> MintWithHardhat -> contract", contractAddress, "targetAddress", targetAddress);
  const publicClient = await publicClientFor(sepolia);
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> MintWithHardhat -> last block number", blockNumber);

  // Create a wallet client
  const walletClient = walletClientFor(deployer);
  console.log("scripts -> MintWithHardhat -> deployer address", walletClient.account.address);
  const balance = await publicClient.getBalance({
    address: walletClient.account.address,
  });
  console.log(
    "scripts -> MintWithHardhat -> deployer balance",
    formatEther(balance),
    walletClient.chain.nativeCurrency.symbol
  );

  // Fetching the role code
  const contract = await viem.getContractAt(contractName, contractAddress, {
    client: {
      public: publicClient,
      wallet: walletClient
    }
  });
  console.log("scripts -> MintWithHardhat -> contract", contract);
  // @ts-expect-error ignore
  const code = await contract.read.MINTER_ROLE();
  console.log("scripts -> MintWithHardhat -> MINTER_ROLE", code);

  // Validate that the contract write will execute without errors.
  // @ts-expect-error ignore
  const mintTx = await contract.write.mint(
    [deployer.address, mintAmount]
  );
  await publicClient.waitForTransactionReceipt({hash: mintTx});
}

main().catch((error) => {
  console.log("\n\nError details:");
  console.error(error);
  process.exitCode = 1;
});
