import { viem } from "hardhat";
import { Chain, createWalletClient, http, TransactionReceipt, formatEther } from "viem";
import { privateKeyToAccount, PrivateKeyAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { constants } from "@lib/constants";

export const myTokenContractAddress = constants.contracts.myToken.sepolia as `0x${string}`;
export const deployerAccount = privateKeyToAccount(`0x${constants.account.deployerPrivateKey}`);

export const checkParameters = (parameters: string[], count: number, tip?: string): void => {
  if (!parameters || parameters.length < (count - 1))
    throw new Error(`Parameters not provided. ${tip}`);
}

export const checkAddress = (type: string, address?: string): void => {
  if (!address) {
    throw new Error(`${type} address not provided.`);
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid ${type} address provided.`);
  }
}

export const publicClientFor = async (chain?: Chain | undefined) => viem.getPublicClient(chain === undefined ? undefined : {
  chain: chain,
  transport: http(constants.integrations.alchemy.sepolia),
});

export const walletClientFor = (account: PrivateKeyAccount) => createWalletClient({
  account: account!,
  chain: sepolia,
  transport: http(constants.integrations.alchemy.sepolia),
});

export const gasPrices = (receipt: TransactionReceipt, consolePrepend?: string) => {
  const gasPrice = receipt.effectiveGasPrice ? formatEther(receipt.effectiveGasPrice) : "N/A";
  const gasUsed = receipt.gasUsed ? receipt.gasUsed.toString() : "N/A";
  const totalCost = receipt.effectiveGasPrice ? formatEther(receipt.effectiveGasPrice * receipt.gasUsed) : "N/A";
  console.log(`${consolePrepend} -> gas -> price`, gasPrice, "used", gasUsed, "totalCost", totalCost);
  return {
    display: {
      gasPrice,
      gasUsed,
      totalCost
    },
    totalCost: receipt.effectiveGasPrice ? receipt.effectiveGasPrice * receipt.gasUsed : 0n
  }
}
