import {viem} from "hardhat";

export const deployContract = async (contract: string) => {
  const publicClient = await viem.getPublicClient();
  const [deployer, otherAccount] = await viem.getWalletClients();
  const ballotContract = await viem.deployContract(contract);
  return { publicClient, deployer, otherAccount, ballotContract };
};
