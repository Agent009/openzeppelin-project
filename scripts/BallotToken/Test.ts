import { viem } from "hardhat";
import { parseEther } from "@node_modules/viem";

const CONTRACT_NAME = "BallotToken";
const MINT_VALUE = parseEther("10");

/**
 * The main function orchestrates the deployment of a BallotToken contract, minting tokens,
 * checking voting power, self-delegating, and experimenting with token transfers.
 *
 * @remarks
 * This function uses the Hardhat EVM (Viem) to interact with the Ethereum blockchain.
 * It deploys the BallotToken contract, mints tokens to an account, checks the voting power of an account,
 * self-delegates the voting power, and transfers tokens between accounts.
 *
 * @returns {Promise<void>} - A promise that resolves when the main function completes.
 */
async function main(): Promise<void> {
  // Deploying contracts to HRE using Viem
  const publicClient = await viem.getPublicClient();
  // @ts-expect-error ignore
  const [deployer, acc1, acc2] = await viem.getWalletClients();
  const acc1Account = acc1!.account;
  const acc1Address = acc1Account.address;
  const acc2Account = acc2!.account;
  const acc2Address = acc2Account.address;
  const contract = await viem.deployContract(CONTRACT_NAME);
  console.log(`${CONTRACT_NAME} -> Test -> Token contract deployed at ${contract.address}\n`);

  // Minting some tokens
  const mintTx = await contract.write.mint([acc1Address, MINT_VALUE]);
  await publicClient.waitForTransactionReceipt({ hash: mintTx });
  console.log(
    `${CONTRACT_NAME} -> Test -> Minted ${MINT_VALUE.toString()} decimal units to account ${
      acc1Address
    }\n`
  );
  const balanceBN = await contract.read.balanceOf([acc1Address]);
  console.log(
    `${CONTRACT_NAME} -> Test -> Account ${
      acc1Address
    } has ${balanceBN.toString()} decimal units of BallotToken\n`
  );

  // Checking vote power
  const votes = await contract.read.getVotes([acc1Address]);
  console.log(
    `${CONTRACT_NAME} -> Test -> Account ${
      acc1Address
    } has ${votes.toString()} units of voting power before self delegating\n`
  );

  // Self delegation transaction
  const delegateTx = await contract.write.delegate([acc1Address], {
    account: acc1Account,
  });
  await publicClient.waitForTransactionReceipt({ hash: delegateTx });
  const votesAfter = await contract.read.getVotes([acc1Address]);
  console.log(
    `Account ${
      acc1Address
    } has ${votesAfter.toString()} units of voting power after self delegating\n`
  );

  // Experimenting a token transfer
  const transferTx = await contract.write.transfer(
    [acc2Address, MINT_VALUE / 2n],
    {
      account: acc1Account,
    }
  );
  await publicClient.waitForTransactionReceipt({ hash: transferTx });
  const votes1AfterTransfer = await contract.read.getVotes([
    acc1Address,
  ]);
  console.log(
    `Account ${
      acc1Address
    } has ${votes1AfterTransfer.toString()} units of voting power after transferring\n`
  );
  const votes2AfterTransfer = await contract.read.getVotes([
    acc2Address,
  ]);
  console.log(
    `Account ${
      acc2Address
    } has ${votes2AfterTransfer.toString()} units of voting power after receiving a transfer\n`
  );

  // Self delegation transaction
  const delegateTx2 = await contract.write.delegate([acc2Address], {
    account: acc2Account,
  });
  await publicClient.waitForTransactionReceipt({ hash: delegateTx2 });
  const votesAfter2 = await contract.read.getVotes([acc2Address]);
  console.log(
    `Account ${
      acc2Address
    } has ${votesAfter2.toString()} units of voting power after self delegating\n`
  );

  // Checking past votes
  const lastBlockNumber = await publicClient.getBlockNumber();
  for (let index = lastBlockNumber - 1n; index > 0n; index--) {
    const pastVotes = await contract.read.getPastVotes([
      acc1Address,
      index,
    ]);
    console.log(
      `Account ${
        acc1Address
      } had ${pastVotes.toString()} units of voting power at block ${index}\n`
    );
  }
}

main().catch((error) => {
  console.log("\n\nError details:");
  console.error(error);
  process.exitCode = 1;
});
