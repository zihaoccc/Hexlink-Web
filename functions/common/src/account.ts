"use strict";

import {ethers, Contract, BigNumber as EthBigNumber } from "ethers";
import type {Provider} from "@ethersproject/providers";
import ACCOUNT_SIMPLE_ABI from "./abi/ACCOUNT_SIMPLE_ABI.json";
import {hash, isContract} from "./utils";
import type {GasObject, OpInput} from "./types";
import type {TransactionReceipt} from "@ethersproject/providers";

export interface Account {
    address: string,
    isContract: boolean,
    owner?: string,
}

export const accountInterface = new ethers.utils.Interface(ACCOUNT_SIMPLE_ABI);

export function nameHash(schema: string, name: string) {
  return hash(`${schema}:${name}`);
}

export function accountContract(provider: Provider, address: string): Contract {
  return new ethers.Contract(
      address,
      ACCOUNT_SIMPLE_ABI,
      provider
  );
}

export async function hexlAccount(
    provider: Provider,
    hexlink: Contract,
    nameHash: string
): Promise<Account> {
  const address = await hexlink.addressOfName(nameHash);
  const acc = {
    address,
    isContract: await isContract(provider, address),
  } as Account;
  if (acc.isContract) {
    const contract = accountContract(provider, address);
    acc.owner = await contract.owner();
  }
  return acc;
}

export function encodeInit(owner: string, data: string) {
  return accountInterface.encodeFunctionData(
    "init",
    [owner, data]
  );
}

export function encodeExec(op: OpInput) {
  return accountInterface.encodeFunctionData(
    "execBatch", [op]
  );
}

export function encodeExecBatch(ops: OpInput[]) {
  return accountInterface.encodeFunctionData(
    "execBatch", [ops]
  );
}

export async function encodeValidateAndCall(params: {
  account: Contract,
  txData: string
  sign: (msg: string) => Promise<string>,
  gas?: GasObject
}) : Promise<{
  data: string,
  signature: string,
  nonce: EthBigNumber
}> {
  const nonce = await params.account.nonce();
  let data: string;
  if (params.gas) {
    const message = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
          ["bytes", "uint256", "tuple(address, address, uint256)"],
          [params.txData, nonce, [
            params.gas.receiver,
            params.gas.token,
            params.gas.price
          ]]
      )
    );
    const signature = await params.sign(message);
    data = params.account.interface.encodeFunctionData(
      "validateAndCallWithGasRefund",
      [
        params.txData,
        nonce, signature,
        params.gas
      ]
    );
    return { data, nonce, signature}
  } else {
    const message = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
          ["bytes", "uint256"],
          [params.txData, nonce]
      )
    );
    const signature = await params.sign(message);
    data = params.account.interface.encodeFunctionData(
      "validateAndCall",
      [params.txData, nonce, signature]
    );
    return { data, nonce, signature}
  }
}

function equal(one: string | undefined, two: string | undefined) : boolean {
  return (one || "").toLowerCase() === (two || "").toLowerCase();
}

export function parseDeposit(
  receipt: TransactionReceipt,
  ref: string,
  from: string,
  to: string,
) {
  const events = receipt.logs.filter(
      (log: any) => log.address.toLowerCase() == from.toLowerCase()
  ).map((log: any) => accountInterface.parseLog(log));
  const event = events.find(
      (e: any) => e.name === "Deposit" && equal(e.args.ref, ref) && equal(e.args.receipt, to)
  );
  return event?.args;
}