// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import { MyToken } from "./MyToken.sol";
import { MyNFT } from "./MyNFT.sol";

contract TokenSale is Ownable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public ratio; // Ratio of ETH to tokens
    uint256 public price; // Price of NFT in tokens
    uint256 public totalSales; // Total sales value in tokens
    uint256 public totalWithdrawn; // Running total of withdrawn tokens
    MyToken public token; // ERC20 token contract
    MyNFT public nft; // ERC721 token contract

    constructor(uint256 _ratio, uint256 _price, MyToken _token, MyNFT _nft) Ownable(msg.sender) {
        ratio = _ratio; // Initialize ratio
        price = _price; // Initialize price
        token = _token; // Set ERC20 token contract
        nft = _nft; // Set ERC721 token contract
    }

    /// Buy tokens with ETH. This mints the tokens for the caller.
    /// @dev <code>await contract.write.buyTokens({value: amount, account: buyer.account});</code>
    function buyTokens() external payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        uint256 tokensToBuy = msg.value * ratio;
        // token.transfer(msg.sender, tokensToBuy);
        token.mint(msg.sender, tokensToBuy);
    }

    /// Burn the tokens. This destroys the tokens and returns their value to the caller.
    /// @dev Can't use payable for non-eth payments. So, burnable amount needs to be passed in params.
    /// * The token contract must first approve the transaction.
    /// <code>const txHash = await token.write.approve([contract.address, amount], { account: user.account });</code>
    /// <code>await publicClient.getTransactionReceipt({hash: txHash});</code>
    /// <code>await contract.write.returnTokens([amount], { account: user.account });</code>
    function returnTokens(uint256 _amount) public {
        require(token.balanceOf(msg.sender) >= _amount, "Insufficient token balance");
        token.burnFrom(msg.sender, _amount);
        payable(msg.sender).transfer(_amount / ratio); // Convert tokens back to ETH
    }

    /// Mint a new NFT for the caller. Requires the caller to have enough tokens to meet the purchasing price.
    /// First transfers the caller's tokens to this contract, and then mints the NFT for the caller.
    function mintNFT(uint256 _tokenId) external {
        uint256 balance = token.balanceOf(msg.sender);
        require(
            balance >= price,
            string(
                abi.encodePacked(
                    "Insufficient tokens to mint NFT. Balance: ",
                    Strings.toString(balance),
                    ", Required: ",
                    Strings.toString(price)
                )
            )
        );
        token.transferFrom(msg.sender, address(this), price); // Transfer tokens to contract
        totalSales += price; // Update total sales
        // Mint the NFT
         nft.safeMint(msg.sender, _tokenId);
    }

    /// Burn the NFT and recover half of the purchase price.
    /// @dev Burn requires approval.
    /// <code>const txHash = await nft.write.approve([contract.address, tokenId], { account: user.account });</code>
    /// <code>await publicClient.getTransactionReceipt({ hash: txHash });</code>
    /// <code>await contract.write.burnNFT([tokenId], { account: user.account });</code>
    /// <code></code>
    function burnNFT(uint256 _tokenId) external {
        require(nft.ownerOf(_tokenId) == msg.sender, "You do not own this NFT");
        nft.burn(_tokenId);
        uint256 refundAmount = price / 2;
        token.transfer(msg.sender, refundAmount); // Refund half the price in tokens
        totalSales -= refundAmount; // Subtract the refunded amount from totalSales
    }

    /// Withdraw tokens from the contract.
    /// @notice This is an owner-only functionality.
    function withdrawTokens(uint256 _amount) external onlyOwner {
        uint256 max = totalSales;
        uint256 withdrawAmount = _amount > max ? max : _amount;
        uint256 balance = token.balanceOf(address(this));
        require(
            balance >= withdrawAmount,
            string(
                abi.encodePacked(
                    "Insufficient tokens in contract. Balance: ",
                    Strings.toString(balance),
                    ", Withdrawing: ",
                    Strings.toString(withdrawAmount)
                )
            )
        );
        token.transfer(msg.sender, withdrawAmount);
        totalWithdrawn += withdrawAmount;
    }
}
