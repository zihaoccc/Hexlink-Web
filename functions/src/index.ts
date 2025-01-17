import {
  processSignUp,
  refreshToken,
} from "./hasura";

exports.processSignUp = processSignUp;
exports.refreshToken = refreshToken;

import {
  isFollowing,
  hasRetweeted} from "./twitter/twitter";

exports.isFollowing = isFollowing;
exports.hasRetweeted = hasRetweeted;

import {
  genTwitterOAuthProof,
  genEmailOTPProof,
  calcEthAddress,
} from "./verifier";

exports.genTwitterOAuthProof = genTwitterOAuthProof;
exports.genEmailOTPProof = genEmailOTPProof;
exports.calcEthAddress = calcEthAddress;

import {
  claimRedPacket,
  createRedPacket,
  createRedPacketErc721,
  claimCountdown,
  refundRedPacket,
} from "./redpacket";

exports.claimRedPacket = claimRedPacket;
exports.createRedPacket = createRedPacket;
exports.createRedPacketErc721 = createRedPacketErc721;
exports.claimCountdown = claimCountdown;
exports.refundRedPacket = refundRedPacket;

import {
  sendToken,
} from "./operation";

exports.sendToken = sendToken;

import {
  genOTP,
  validateOTP,
} from "./signin";

exports.genOTP = genOTP;
exports.validateOTP = validateOTP;
