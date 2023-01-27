import type { ethers } from "ethers";
export interface Chain {
    name: string;
    chainId?: string;
    rpcUrls: string[];
    fullName: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    blockExplorerUrls: string[];
    logoUrl: string;
}
export declare const GOERLI: Chain;
export declare const POLYGON: Chain;
export declare const MUMBAI: Chain;
export declare const SUPPORTED_CHAINS: Chain[];
export declare function getChainFromProvider(provider: ethers.providers.Provider): Promise<Chain>;
export declare function getChain(chain: string | number): Chain;