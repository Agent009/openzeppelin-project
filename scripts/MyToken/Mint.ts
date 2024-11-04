import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { abi } from "@artifacts/contracts/MyToken.sol/MyToken.json";
import { constants } from "@lib/constants";

async function main() {
  const contractAddress = constants.contracts.myToken.sepolia as `0x${string}`;
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(constants.integrations.alchemy.sepolia),
  });
  const blockNumber = await publicClient.getBlockNumber();
  console.log("scripts -> Mint -> last block number", blockNumber);

  // Create a wallet client
  const deployer = privateKeyToAccount(`0x${constants.account.deployerPrivateKey}`);
  const walletClient = createWalletClient({
    account: deployer,
    chain: sepolia,
    transport: http(constants.integrations.alchemy.sepolia),
  });
  console.log("scripts -> Mint -> deployer address", walletClient.account.address);
  const balance = await publicClient.getBalance({
    address: walletClient.account.address,
  });
  console.log(
    "scripts -> Mint -> deployer balance",
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
  console.log("scripts -> Mint -> code", code);

  // Validate that the contract write will execute without errors.
  // const { request } = await publicClient.simulateContract({
  //   account: deployer,
  //   address: contractAddress,
  //   abi,
  //   functionName: 'mint',
  //   args: [deployer.account.address, parseEther("10")],
  // });
  // // console.log("scripts -> GiveRightToVote -> simulate -> request", request);
  // // Execute the contract
  // const hash = await walletClient.writeContract(request);
  //
  // // Minting tokens without role fails
  // const mintTx = await tokenContract.write.mint(
  //   [deployer.account.address, parseEther("10")],
  //   { account: account2.account }
  // );
  // await publicClient.waitForTransactionReceipt({ hash: mintTx });
}

main().catch((error) => {
  console.log("\n\nError details:");
  console.error(error);
  process.exitCode = 1;
});
