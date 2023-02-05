"use strict";
import GOERLI_TOKENS from "./tokens/GOERLI_TOKENS.json";
import MUMBAI_TOKENS from "./tokens/MUMBAI_TOKENS.json";
import POLYGON_TOEKNS from "./tokens/POLYGON_TOKENS.json";
import ADDRESSES from "./addresses.json";
import { BigNumber as EthBigNumber } from "ethers";
import { BigNumber } from "bignumber.js";
import { toEthBigNumber } from "./utils";
export function nativeCoinAddress(chain) {
    return ADDRESSES[chain.name].nativeCoin.toLowerCase();
}
export function wrappedCoinAddress(chain) {
    return ADDRESSES[chain.name].wrappedCoin.toLowerCase();
}
export function stableCoinAddresses(chain) {
    return ADDRESSES[chain.name].stableCoins.map((a) => a.toLowerCase());
}
export function allowedGasToken(chain) {
    return [
        nativeCoinAddress(chain),
        wrappedCoinAddress(chain),
        ...stableCoinAddresses(chain),
    ];
}
// const POLYGON_POPULAR_TOKENS = "https://api-polygon-tokens.polygon.technology/tokenlists/popularTokens.tokenlist.json";
export async function getPopularTokens(chain) {
    if (chain.chainId == "137") {
        // const response = await fetch(POLYGON_POPULAR_TOKENS);
        // return await response.json();
        return {
            timestamp: new Date().toISOString(),
            tokens: POLYGON_TOEKNS,
        };
    }
    if (chain.chainId == "5") {
        return {
            timestamp: new Date().toISOString(),
            tokens: GOERLI_TOKENS,
        };
    }
    if (chain.chainId == "80001") {
        return {
            timestamp: new Date().toISOString(),
            tokens: MUMBAI_TOKENS,
        };
    }
    return {
        tokens: [],
        timestamp: new Date().toDateString(),
        error: "Unsupported network " + chain.chainId,
    };
}
function equal(a, b) {
    return a.toLowerCase() == b.toLowerCase();
}
export function isNativeCoin(token, chain) {
    return equal(token, nativeCoinAddress(chain));
}
export function isWrappedCoin(token, chain) {
    return equal(token, wrappedCoinAddress(chain));
}
export function isStableCoin(token, chain) {
    return stableCoinAddresses(chain).includes(token.toLowerCase());
}
export function tokenBase(token) {
    return new BigNumber(10).pow(token.decimals);
}
export function tokenAmount(balance, decimals) {
    return toEthBigNumber(new BigNumber(10).pow(decimals).times(balance));
}
export function calcGas(chain, gasToken, amount, priceInfo) {
    if (isNativeCoin(gasToken.address, chain) || isWrappedCoin(gasToken.address, chain)) {
        return amount.mul(priceInfo.gasPrice);
    }
    else if (isStableCoin(gasToken.address, chain)) {
        // calculate usd value of tokens
        const normalizedUsd = new BigNumber(10).pow(gasToken.decimals).times(priceInfo.nativeCurrencyInUsd);
        const nativeCoinBase = EthBigNumber.from(10).pow(chain.nativeCurrency.decimals);
        return toEthBigNumber(normalizedUsd).mul(amount).mul(priceInfo.gasPrice).div(nativeCoinBase);
    }
    throw new Error("Unsupported gas token");
}
