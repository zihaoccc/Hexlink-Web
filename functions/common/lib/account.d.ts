import { ethers, Contract, BigNumber as EthBigNumber } from "ethers";
import type { Provider } from "@ethersproject/providers";
import { GasObject, UserOpInput } from "./types";
export interface Account {
    address: string;
    isContract: boolean;
    owner?: string;
}
export declare const accountInterface: ethers.utils.Interface;
export declare function nameHash(schema: string, name: string): string;
export declare function accountContract(provider: Provider, address: string): Contract;
export declare function hexlAccount(provider: Provider, hexlink: Contract, nameHash: string): Promise<Account>;
export declare function encodeInit(owner: string, data: string): string;
export declare function encodeExec(op: UserOpInput): string;
export declare function encodeExecBatch(ops: UserOpInput[]): string;
export declare function encodeValidateAndCall(params: {
    ops: UserOpInput[];
    signature: string;
    nonce: EthBigNumber;
    gas?: GasObject;
}): string;