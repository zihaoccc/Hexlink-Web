import { BigNumber } from "bignumber.js";
import { Chain } from "./chain";
import { isNativeCoin, isStableCoin, isWrappedCoin } from "./tokens";
import { BigNumber as EthBigNumber } from "ethers";

export interface PriceConfig {
    nativeCurrencyInUsd: string,
    gasPrice: string,
}

const GOERLI : PriceConfig = {
    nativeCurrencyInUsd: "1500.0",
    gasPrice: "10000000000", // 10 gwei
};

const POLYGON : PriceConfig = {
    nativeCurrencyInUsd: "1.0",
    gasPrice: "100000000000", // 100 gwei
};

const MUMBAI : PriceConfig = {
    nativeCurrencyInUsd: "1.0",
    gasPrice: "2000000000", // 2 gwei
};

export const PriceConfigs : {[key: string]: PriceConfig} = {
    "goerli": GOERLI,
    "polygon": POLYGON,
    "mumbai": MUMBAI,
};

export function gasTokenPricePerGwei(
    chain: Chain,
    token: string,
    decimals: number,
    price: PriceConfig
) : string {
    if (isNativeCoin(token, chain) || isWrappedCoin(token, chain)) {
        return "1000000000"; // 1Gwei = 10^9 wei
    }
    if (isStableCoin(token, chain)) {
        const oneEth = BigNumber(10).pow(decimals).times(price.nativeCurrencyInUsd)
        const oneGwei = EthBigNumber.from(oneEth.div(1000000000).toString(10));
        return oneGwei.toString();
    }
    throw new Error("Not supported gas token");
};