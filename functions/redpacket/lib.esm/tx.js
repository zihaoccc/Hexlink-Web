import { BigNumber as EthBigNumber } from "ethers";
import { accountInterface } from "../../common";
import { isNativeCoin, erc20Interface } from "../../common";
import { redPacketInterface, redPacketAddress } from "./redpacket";
export function buildGasSponsorshipOp(hexlAccount, refunder, input) {
    return {
        name: "depositGasSponsorship",
        function: "deposit",
        args: {
            ref: input.id,
            receipt: refunder,
            token: input.gasToken,
            amount: input.gasTokenAmount
        },
        input: {
            to: hexlAccount,
            value: EthBigNumber.from(0),
            callData: accountInterface.encodeFunctionData("deposit", [
                input.id,
                refunder,
                input.gasToken,
                input.gasTokenAmount
            ]),
            callGasLimit: EthBigNumber.from(0) // no limit
        }
    };
}
export function buildRedPacketOps(chain, input) {
    const packet = {
        token: input.token,
        salt: input.salt,
        balance: input.balance,
        validator: input.validator,
        split: input.split,
        mode: input.mode,
    };
    const redPacketAddr = redPacketAddress(chain);
    if (isNativeCoin(input.token, chain)) {
        return [{
                name: "createRedPacket",
                function: "create",
                args: { packet },
                input: {
                    to: redPacketAddr,
                    value: EthBigNumber.from(packet.balance),
                    callData: redPacketInterface.encodeFunctionData("create", [packet]),
                    callGasLimit: EthBigNumber.from(0) // no limit
                }
            }];
    }
    else {
        return [{
                name: "approveRedPacket",
                function: "approve",
                args: {
                    operator: redPacketAddr,
                    amount: packet.balance
                },
                input: {
                    to: input.token,
                    value: EthBigNumber.from(0),
                    callData: erc20Interface.encodeFunctionData("approve", [redPacketAddr, packet.balance]),
                    callGasLimit: EthBigNumber.from(0) // no limit
                }
            },
            {
                name: "createRedPacket",
                function: "create",
                args: { packet },
                input: {
                    to: redPacketAddr,
                    value: EthBigNumber.from(0),
                    callData: redPacketInterface.encodeFunctionData("create", [packet]),
                    callGasLimit: EthBigNumber.from(0) // no limit
                }
            }];
    }
}
