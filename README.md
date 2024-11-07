# OpenZeppelin Project

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
```

## BallotToken

### Scripts

```bash
npm run mytoken:deploy:hh # deploy locally
npm run mytoken:deploy:vi # deploy to testnet
npm run mytoken:mint:hh 0x0b5455bac0f3795b5927f37bc545c3eae08c8b4a 20 # use hardhat helper script
npm run mytoken:mint:vi 0x0b5455bac0f3795b5927f37bc545c3eae08c8b4a 20 # use core viem functions
```

## TokenizedBallot

### Scripts

```bash
npm run ballottoken:deploy:test # deploy locally for testing purposes
npm run ballottoken:deploy # deploy to testnet
```
