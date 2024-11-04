import {viem} from "hardhat";
import {Chain, createWalletClient, http} from "viem";
import {privateKeyToAccount, PrivateKeyAccount} from "viem/accounts";
import {sepolia} from "viem/chains";
import {constants} from "@lib/constants";

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
