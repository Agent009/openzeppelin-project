import { expect } from "chai";
import { viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { PublicClient } from "@nomicfoundation/hardhat-viem/src/types";

const CONTRACT_NAME = "MyToken";

const deployContract = async () => {
  const publicClient: PublicClient = await viem.getPublicClient();
  const [deployer, account2, account3] = await viem.getWalletClients();
  const deployerAddress = deployer!.account.address;
  const account2Address = account2!.account.address;
  const contract = await viem.deployContract(CONTRACT_NAME);
  return { publicClient, deployer, deployerAddress, account2, account3, account2Address, contract };
};

const transferFixture = async (publicClient: PublicClient, contract: any, toAddress: string, amount: bigint) => {
  const { deployer } = await loadFixture(deployContract);
  // Execute the transfer transaction
  // https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-viem#contracts
  const txHash = await contract.write.transfer([toAddress, amount]);
  // https://viem.sh/docs/actions/public/getTransactionReceipt#gettransactionreceipt
  const receipt = await publicClient.getTransactionReceipt({hash: txHash});
  // console.log("Ballot -> giveRightToVoteFixture -> txHash", txHash, "receipt", receipt);
  // https://viem.sh/docs/glossary/terms#transaction-receipt
  expect(receipt.status).to.equal("success");
  // Get the events from the transfer transaction
  const events = await contract.getEvents.Transfer();
  console.log("MyToken -> transferFixture -> events", events);
  expect(events).to.have.lengthOf(1);
  expect(events[0].args.from?.toLowerCase()).to.equal(deployer!.account.address);
  expect(events[0].args.to?.toLowerCase()).to.equal(toAddress);
  expect(events[0].args.value).to.equal(amount);
};

describe(CONTRACT_NAME, async () => {
  describe("Basic tests for understanding ERC20", async () => {
    it("triggers the Transfer event with the address of the sender when sending transactions", async () => {
      const { contract, publicClient, account2Address } = await loadFixture(deployContract);
      await transferFixture(publicClient, contract, account2Address, 1n);
    });
  });
});
