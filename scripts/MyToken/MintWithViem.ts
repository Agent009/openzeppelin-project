import { viem } from "hardhat";
import { formatEther, parseEther } from "viem";
import { sepolia } from "viem/chains";
import { abi } from "@artifacts/contracts/MyToken.sol/MyToken.json";
import {
  checkAddress,
  checkParameters,
  deployerAccount, gasPrices,
  myTokenContractAddress,
  publicClientFor,
  walletClientFor
} from "@scripts/utils";
import {formatUnits} from "@node_modules/viem";

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
  console.log("scripts -> MintWithViem -> contract", contractAddress, "targetAddress", targetAddress);
  const publicClient = await publicClientFor(sepolia);
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> MintWithViem -> last block number", blockNumber);

  // Create a wallet client
  const walletClient = walletClientFor(deployer);
  console.log("scripts -> MintWithViem -> deployer address", walletClient.account.address);
  const balance = await publicClient.getBalance({
    address: walletClient.account.address,
  });
  console.log(
    "scripts -> MintWithViem -> deployer balance",
    formatEther(balance),
    walletClient.chain.nativeCurrency.symbol
  );

  // Fetching the role code
  const code = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "MINTER_ROLE",
    args: [],
  })) as any[];
  console.log("scripts -> MintWithViem -> MINTER_ROLE", code);

  // Grant minting role
  const { request: grantRoleRequest } = await publicClient.simulateContract({
    account: deployer,
    address: contractAddress,
    abi,
    functionName: 'grantRole',
    args: [code, deployer.address],
  });
  console.log("scripts -> MintWithViem -> simulate(grantRole) -> request", grantRoleRequest);
  let hash = await walletClient.writeContract(grantRoleRequest);
  console.log("scripts -> MintWithViem -> transaction hash", hash, "waiting for confirmations...");
  let receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("scripts -> MintWithViem -> transaction confirmed -> receipt", receipt.blockNumber);
  gasPrices(receipt, "scripts -> MintWithViem");

  // Mint
  const { request } = await publicClient.simulateContract({
    account: deployer, // Minting tokens with the proper Minter Role
    // account: account2!.account, // Minting tokens without role fails
    address: contractAddress,
    abi,
    functionName: 'mint',
    args: [targetAddress, mintAmount],
  });
  console.log("scripts -> MintWithViem -> simulate(mint) -> request", request);
  hash = await walletClient.writeContract(request);
  console.log("scripts -> MintWithViem -> transaction hash", hash, "waiting for confirmations...");
  receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("scripts -> MintWithViem -> transaction confirmed -> receipt", receipt.blockNumber);
  gasPrices(receipt, "scripts -> MintWithViem");

  if (receipt.status === "success") {
    console.log("scripts -> MintWithViem -> transaction succeeded");
  } else {
    console.error("scripts -> MintWithViem -> transaction failed");
  }

  // Fetch token data concurrently
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "name",
      args: [],
    }) as Promise<string>,
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "symbol",
      args: [],
    }) as Promise<string>,
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "decimals",
      args: [],
    }) as Promise<number>,
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "totalSupply",
      args: [],
    }) as Promise<bigint>,
  ]);
  console.log("scripts -> MintWithHardhat -> token data", {name, symbol, decimals, totalSupply});

  const deployerBalance = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "balanceOf",
    args: [deployer.address],
  })) as bigint;
  console.log(`Deployer balance is ${deployerBalance} decimals units, ${formatEther(deployerBalance)} ${symbol}, ${formatUnits(deployerBalance, 18)} ${symbol}`);
}

main().catch((error) => {
  console.log("\n\nError details:");
  console.error(error);
  process.exitCode = 1;
});
