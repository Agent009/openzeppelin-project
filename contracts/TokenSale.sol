// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { MyToken } from "./MyToken.sol";
import { MyNFT } from "./MyNFT.sol";

contract TokenSale is Ownable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public ratio; // Ratio of ETH to tokens
    uint256 public price; // Price of NFT in tokens
    uint256 public totalSales; // Total sales value in tokens
    MyToken public token; // ERC20 token contract
    MyNFT public nft; // ERC721 token contract

    constructor(uint256 _ratio, uint256 _price, MyToken _token, MyNFT _nft) Ownable(msg.sender) {
        ratio = _ratio; // Initialize ratio
        price = _price; // Initialize price
        token = _token; // Set ERC20 token contract
        nft = _nft; // Set ERC721 token contract
    }

    // Function to buy tokens with ETH
    function buyTokens() external payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        uint256 tokensToBuy = msg.value * ratio;
        // token.transfer(msg.sender, tokensToBuy);
        token.mint(msg.sender, tokensToBuy);
    }

    /// Burn the tokens
    /// @dev can't use payable for non-eth payments. So, burnable amount needs to be passed in params.
    function returnTokens(uint256 _amount) public {
        require(token.balanceOf(msg.sender) >= _amount, "Insufficient token balance");
        token.burnFrom(msg.sender, _amount);
        payable(msg.sender).transfer(_amount / ratio); // Convert tokens back to ETH
    }

    // Function to withdraw ETH by burning tokens
    function withdrawETH(uint256 _amount) external {
        require(token.balanceOf(msg.sender) >= _amount, "Insufficient token balance");
        token.burn(_amount); // Destroy the tokens
        payable(msg.sender).transfer(_amount / ratio); // Convert tokens back to ETH
    }

    // Function to mint a new NFT
    function mintNFT(uint256 _tokenId) external {
        require(token.balanceOf(msg.sender) >= price, "Insufficient tokens to mint NFT");
        token.transferFrom(msg.sender, address(this), price); // Transfer tokens to contract
        totalSales += price; // Update total sales
        // Mint the NFT
         nft.safeMint(msg.sender, _tokenId);
    }

    // Function to burn NFT and recover half of the purchase price
    function burnNFT(uint256 _tokenId) external {
        require(nft.ownerOf(_tokenId) == msg.sender, "You do not own this NFT");
         nft.burn(_tokenId);
        uint256 refundAmount = price / 2;
        token.transfer(msg.sender, refundAmount); // Refund half the price in tokens
    }

    // Function for owner to withdraw tokens from the contract
    function withdrawTokens() external onlyOwner {
        uint256 withdrawableAmount = totalSales / 2; // Only half of sales value is available for withdraw
        require(token.balanceOf(address(this)) >= withdrawableAmount, "Insufficient tokens in contract");
        token.transfer(msg.sender, withdrawableAmount);
    }
}
