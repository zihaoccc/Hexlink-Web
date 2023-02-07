/* eslint-disable require-jsdoc */
import * as functions from "firebase-functions";

import {getRedPacket} from "./graphql/redpacket";
import type {RedPacket} from "./graphql/redpacket";
import {signWithKmsKey} from "./kms";
import {ethers, BigNumber as EthBigNumber} from "ethers";
import {
  accountAddress,
  toEthSignedMessageHash,
} from "./account";
import {KMS_KEY_TYPE, kmsConfig} from "./config";

import {
  redPacketAddress,
  redPacketInterface,
  redpacketId
} from "../redpacket";
import {Firebase} from "./firebase";
import {
  UserOpRequest,
  accountInterface,
  getChain,
  PriceConfigs,
  gasTokenDecimals,
  gasTokenPricePerGwei,
  refunder,
} from "../common";
import type {Chain, GasObject, OpInput} from "../common";
import {submit} from "./services/operation";
import {insertRequest} from "./graphql/request";

const secrets = functions.config().doppler || {};

async function sign(signer: string, message: string) : Promise<string> {
  const validator = new ethers.Wallet(secrets.HARDHAT_VALIDATOR);
  if (signer.toLowerCase() == validator.address.toLowerCase()) {
    return await validator.signMessage(ethers.utils.arrayify(message));
  } else {
    const keyType = KMS_KEY_TYPE[KMS_KEY_TYPE.validator];
    const kmsValidator = kmsConfig().get(keyType)!.publicAddress;
    if (signer.toLowerCase() == kmsValidator.toLowerCase()) {
      return await signWithKmsKey(
          keyType,
          toEthSignedMessageHash(message)
      ) as string;
    } else {
      throw new Error("invalid validator");
    }
  }
}

async function buildClaimOp(
    chain: Chain,
    redPacket: RedPacket,
    claimer: string,
) : Promise<OpInput> {
  const message = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "address"],
          [redPacket.id, claimer]
      )
  );
  const signature = await sign(redPacket.metadata.validator, message);
  const args = {
    creator: redPacket.metadata.creator,
    packet: {
      token: redPacket.metadata.token,
      salt: redPacket.metadata.salt,
      balance: redPacket.metadata.balance,
      validator: redPacket.metadata.validator,
      split: redPacket.metadata.split,
      mode: redPacket.metadata.mode,
    },
    claimer,
    signature,
  };
  return {
    to: redPacketAddress(chain),
    value: "0x0",
    callData: redPacketInterface.encodeFunctionData("claim", [args]),
    callGasLimit: "0x0",
  };
}

export const claimRedPacket = functions.https.onCall(
    async (data, context) => {
      Firebase.getInstance();
      const uid = context.auth?.uid;
      if (!uid) {
        return {code: 401, message: "Unauthorized"};
      }

      const chain = getChain(data.chain);
      const account = await accountAddress(chain, uid);
      if (!account.address) {
        return {code: 400, message: "invalid account"};
      }

      const redPacket = await getRedPacket(data.redPacketId);
      if (!redPacket) {
        return {code: 400, message: "Failed to load redpacket"};
      }

      const input = await buildClaimOp(chain, redPacket, account.address);
      const action = {
        type: "insert_redpacket_claim",
        params: {
          redPacketId: redPacket.id,
          creatorId: redPacket.user_id,
          claimerId: uid,
          claimer: data.claimer,
        },
      };
      const [{id: reqId}] = await insertRequest(
          uid,
          [{
            to: redPacketAddress(chain),
            args: {
              redPacketId: redPacket.id,
            },
          }]
      );
      const result = await submit(chain, {
        type: "claim_redpacket",
        input,
        account: account.address,
        userId: uid,
        actions: [action],
        requestId: reqId,
      });
      return {code: 200, id: result.id};
    }
);

function validateGas(chain: Chain, gas: GasObject) {
  if (gas.receiver !== refunder(chain)) {
    throw new Error("invalid gas refunder");
  }
  const price = gasTokenPricePerGwei(
      chain, gas.token, PriceConfigs[chain.name]
  );
  if (EthBigNumber.from(gas.price).lt(price)) {
    throw new Error("invalid gas price");
  }
}

async function validateAndbuildUserOp(
    chain: Chain,
    account: string,
    request: UserOpRequest,
) : Promise<OpInput> {
  const data = accountInterface.encodeFunctionData(
      "validateAndCallWithGasRefund",
      [request.txData, request.nonce, request.signature, request.gas]
  );
  validateGas(chain, request.gas);
  return {
    to: account,
    value: "0x0",
    callData: data,
    callGasLimit: "0x0",
  };
}

export const createRedPacket = functions.https.onCall(
    async (data, context) => {
      Firebase.getInstance();
      const uid = context.auth?.uid;
      if (!uid) {
        return {code: 401, message: "Unauthorized"};
      }
      const chain = getChain(data.chain);
      const account = await accountAddress(chain, uid);
      if (!account.address) {
        return {code: 400, message: "invalid account"};
      }
      const rpId = redpacketId(chain, account.address, data.redPacket);
      const action = {
        type: "insert_redpacket",
        params: {
          userId: uid,
          redPacketId: rpId,
          creator: data.creator,
          refunder: refunder(chain),
          priceInfo: data.redPacket.priceInfo,
        },
      };
      const [{id: reqId}] = await insertRequest(
          uid,
          [{
            to: redPacketAddress(chain),
            args: {
              redPacketId: rpId,
              metadata: data.redPacket,
            },
          }]
      );
      const postData: any = {
        type: "create_redpacket",
        userId: uid,
        actions: [action],
        account: account.address,
        requestId: reqId,
      };
      if (data.txHash) {
        postData.tx = data.txHash;
      } else {
        postData.input = await validateAndbuildUserOp(
            chain, account.address, data.request
        );
      }
      const result = await submit(chain, postData);
      return {code: 200, id: result.id};
    }
);
