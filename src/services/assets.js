// @flow
/*
    Pillar Wallet: the personal data locker
    Copyright (C) 2019 Stiftung Pillar Project

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/
import ethers, { Contract, utils, BigNumber as EthersBigNumber } from 'ethers';
import { getEnv } from 'configs/envConfig';
import isEmpty from 'lodash.isempty';

// constants
import { ETH } from 'constants/assetsConstants';
import { ERROR_TYPE } from 'constants/transactionsConstants';

// utils
import {
  getEthereumProvider,
  isCaseInsensitiveMatch,
  parseTokenBigNumberAmount,
  reportErrorLog,
  reportLog,
} from 'utils/common';
import { nativeAssetPerChain } from 'utils/chains';

// abis
import ERC20_CONTRACT_ABI from 'abi/erc20.json';
import ERC721_CONTRACT_ABI from 'abi/erc721.json';
import ERC721_CONTRACT_ABI_SAFE_TRANSFER_FROM from 'abi/erc721_safeTransferFrom.json';
import ERC721_CONTRACT_ABI_TRANSFER_FROM from 'abi/erc721_transferFrom.json';

// services
import {
  getCoinGeckoTokenPrices,
  getCoinGeckoPricesByCoinId,
  chainToCoinGeckoCoinId,
} from 'services/coinGecko';

// types
import type { AssetsBySymbol } from 'models/Asset';
import type { RatesBySymbol } from 'models/Rates';


type Address = string;

type ERC20TransferOptions = {
  contractAddress: ?string,
  to: Address,
  amount: number | string,
  wallet: Object,
  decimals: number,
  nonce?: number,
  signOnly?: ?boolean,
  gasLimit?: number,
  gasPrice?: number,
  data?: string,
};

type ERC721TransferOptions = {
  contractAddress: ?string,
  from: Address,
  to: Address,
  tokenId: string,
  wallet: Object,
  nonce?: number,
  signOnly?: ?boolean,
  gasLimit?: ?number,
  gasPrice?: ?number,
};

type ETHTransferOptions = {
  gasLimit?: number,
  gasPrice?: number,
  amount: number | string,
  to: Address,
  wallet: Object,
  nonce?: number,
  signOnly?: ?boolean,
  data?: string,
};

export const encodeContractMethod = (
  contractAbi: string | Object[],
  method: string,
  params: any,
) => {
  const contractInterface = new ethers.utils.Interface(contractAbi);
  return contractInterface.encodeFunctionData(method, params);
};

function contractHasMethod(contractCode, encodedMethodName) {
  return contractCode.includes(encodedMethodName);
}

export async function transferERC20(options: ERC20TransferOptions) {
  const {
    contractAddress,
    amount,
    wallet: walletInstance,
    decimals: defaultDecimals = 18,
    nonce,
    gasLimit,
    gasPrice,
    signOnly = false,
  } = options;
  let { data, to } = options;

  const wallet = walletInstance.connect(getEthereumProvider(getEnv().NETWORK_PROVIDER));
  const contractAmount = parseTokenBigNumberAmount(amount, defaultDecimals);

  if (!data) {
    try {
      data = encodeContractMethod(ERC20_CONTRACT_ABI, 'transfer', [to, contractAmount]);
    } catch (e) {
      //
    }
    to = contractAddress;
  }

  const transaction = {
    gasLimit,
    gasPrice: EthersBigNumber.from(gasPrice),
    to,
    nonce,
    data,
  };
  if (!signOnly) return wallet.sendTransaction(transaction);

  const signedHash = await wallet.signTransaction(transaction);
  return { signedHash, value: contractAmount };
}

/* eslint-disable i18next/no-literal-string */
export function getERC721ContractTransferMethod(code: any, isReceiverContractAddress: boolean): string {
  /**
   * sending to contract with "safeTransferFrom" will fail if contract doesn't have
   * "onERC721Received" event implemented, just to make everything more
   * stable we can just disable safeTransferFrom if receiver
   * address is contract and use other methods
   * this can be improved by checking if contract byte code
   * contains hash of "onERC721Received", but this might not be
   * always true as "contract" might be a proxy and will return that
   * it doesn't have it anyway
   * (ref – https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md)
   */

  // first 4 bytes of the encoded signature for a lookup in the contract code
  // encoding: utils.keccak256(utils.toUtf8Bytes(signature)
  const transferHash = 'a9059cbb'; // transfer(address,uint256)
  const safeTransferFromHash = '42842e0e'; // safeTransferFrom(address,address,uint256)


  if (!isReceiverContractAddress && contractHasMethod(code, safeTransferFromHash)) {
    return 'safeTransferFrom';
  } else if (contractHasMethod(code, transferHash)) {
    return 'transfer';
  }

  /**
   * sometimes code contains proxy contract code on which one of the methods can be found,
   * let's fallback to transferFrom which belongs to EIP 721/1155 standard
   */
  // const transferFromHash = '23b872dd'; // transferFrom(address,address,uint256)

  return 'transferFrom';
}
/* eslint-enable i18next/no-literal-string */

export const getContractMethodAbi = (
  contractAbi: Object[],
  methodName: string,
): ?Object => contractAbi.find(item => item.name === methodName);

export const buildERC721TransactionData = async (transaction: Object, customProvider?: any): any => {
  const {
    from,
    to,
    tokenId,
    contractAddress,
  } = transaction;

  let contractAbi;
  let params;

  const provider = customProvider || getEthereumProvider(getEnv().NETWORK_PROVIDER);

  const code = await provider.getCode(contractAddress);
  const receiverCode = await provider.getCode(contractAddress);
  // regular address will return exactly 0x while contract address will return 0x...0
  const isReceiverContractAddress = receiverCode && receiverCode.length > 2;
  const contractTransferMethod = getERC721ContractTransferMethod(code, isReceiverContractAddress);

  try {
    switch (contractTransferMethod) {
      case 'safeTransferFrom':
        contractAbi = ERC721_CONTRACT_ABI_SAFE_TRANSFER_FROM;
        params = [from, to, tokenId];
        break;
      case 'transfer':
        contractAbi = ERC721_CONTRACT_ABI;
        params = [to, tokenId];
        break;
      case 'transferFrom':
        contractAbi = ERC721_CONTRACT_ABI_TRANSFER_FROM;
        params = [from, to, tokenId];
        break;
      default:
    }
  } catch (e) {
    // unable to transfer
  }

  // $FlowFixMe – asks for contractAbi to be surely initialized
  return encodeContractMethod(contractAbi, contractTransferMethod, params);
};

export async function transferERC721(options: ERC721TransferOptions) {
  const {
    contractAddress,
    tokenId,
    wallet: walletInstance,
    nonce,
    gasLimit,
    gasPrice,
    signOnly = false,
  } = options;

  const wallet = walletInstance.connect(getEthereumProvider(getEnv().COLLECTIBLES_NETWORK));
  const data = await buildERC721TransactionData(options, wallet.provider);

  if (data) {
    const transaction = {
      gasLimit,
      gasPrice: EthersBigNumber.from(gasPrice),
      to: contractAddress,
      nonce,
      data,
    };

    if (signOnly) return wallet.signTransaction({ ...transaction, data });

    return wallet.sendTransaction(transaction);
  }

  reportLog('Could not transfer collectible', {
    networkProvider: getEnv().COLLECTIBLES_NETWORK,
    contractAddress,
    tokenId,
  });
  return { error: ERROR_TYPE.CANT_BE_TRANSFERRED, noRetry: true };
}

export async function transferETH(options: ETHTransferOptions) {
  const {
    to,
    wallet: walletInstance,
    gasPrice,
    gasLimit,
    amount,
    nonce,
    signOnly = false,
    data,
  } = options;
  const value = utils.parseEther(amount.toString());
  const trx = {
    gasLimit,
    gasPrice: EthersBigNumber.from(gasPrice),
    value,
    to,
    nonce,
    data,
  };
  const wallet = walletInstance.connect(getEthereumProvider(getEnv().NETWORK_PROVIDER));
  if (!signOnly) return wallet.sendTransaction(trx);
  const signedHash = await wallet.signTransaction(trx);
  return { signedHash, value };
}

// Fetch methods are temporary until the BCX API provided

export function fetchETHBalance(walletAddress: Address): Promise<string> {
  const provider = getEthereumProvider(getEnv().NETWORK_PROVIDER);
  return provider.getBalance(walletAddress).then(utils.formatEther);
}

export function fetchRinkebyETHBalance(walletAddress: Address): Promise<string> {
  const provider = getEthereumProvider('rinkeby');
  return provider.getBalance(walletAddress).then(utils.formatEther);
}

export async function getExchangeRates(
  chain: string,
  assets: AssetsBySymbol,
): Promise<?RatesBySymbol> {
  const assetSymbols = Object.keys(assets);

  if (isEmpty(assetSymbols)) {
    reportLog('getExchangeRates received empty assetSymbols array', { assetSymbols });
    return null;
  }

  // $FlowFixMe
  let rates = await getCoinGeckoTokenPrices(chain, assets);

  const nativeAssetSymbol = nativeAssetPerChain[chain].symbol;

  if (assetSymbols.includes(nativeAssetSymbol)) {
    const coinId = chainToCoinGeckoCoinId[chain];
    const nativeAssetPrice = await getCoinGeckoPricesByCoinId(coinId);
    if (!isEmpty(nativeAssetPrice)) {
      // $FlowFixMe
      rates = { ...rates, [nativeAssetSymbol]: nativeAssetPrice };
    }
  }

  if (!rates) {
    reportErrorLog('getExchangeRates failed: no rates data', { rates, assetSymbols });
    return null;
  }

  /**
   * sometimes symbols have different symbol case and mismatch
   * between our back-end and rates service returned result
   */
  return Object.keys(rates).reduce((mappedData, returnedSymbol: string) => {
    const walletSupportedSymbol = assetSymbols.find((symbol) => isCaseInsensitiveMatch(symbol, returnedSymbol));
    if (walletSupportedSymbol && !mappedData[walletSupportedSymbol] && rates) {
      mappedData = {
        ...mappedData,
        [walletSupportedSymbol]: rates[returnedSymbol],
      };
    }
    return mappedData;
  }, {});
}

// from the getTransaction() method you'll get the the basic tx info without the status
export function fetchTransactionInfo(hash: string, network?: string): Promise<?Object> {
  const provider = getEthereumProvider(network || getEnv().NETWORK_PROVIDER);
  return provider.getTransaction(hash).catch(() => null);
}

// receipt available for mined transactions only, here you can get the status of the tx
export function fetchTransactionReceipt(hash: string, network?: string): Promise<?Object> {
  const provider = getEthereumProvider(network || getEnv().NETWORK_PROVIDER);
  return provider.getTransactionReceipt(hash).catch(() => null);
}

export function fetchLastBlockNumber(network?: string): Promise<number> {
  const provider = getEthereumProvider(network || getEnv().NETWORK_PROVIDER);
  return provider.getBlockNumber().then(parseInt).catch(() => 0);
}

export function transferSigned(signed: ?string) {
  const provider = getEthereumProvider(getEnv().NETWORK_PROVIDER);
  return provider.sendTransaction(signed);
}

export function waitForTransaction(hash: string) {
  const provider = getEthereumProvider(getEnv().NETWORK_PROVIDER);
  return provider.waitForTransaction(hash);
}

export const DEFAULT_GAS_LIMIT = 500000;

export async function calculateGasEstimate(transaction: Object) {
  const {
    from,
    amount,
    symbol,
    contractAddress,
    decimals: defaultDecimals = 18,
    tokenId,
  } = transaction;
  let { to, data } = transaction;
  const provider = getEthereumProvider(tokenId ? getEnv().COLLECTIBLES_NETWORK : getEnv().NETWORK_PROVIDER);
  const value = symbol === ETH
    ? utils.parseEther(amount.toString())
    : '';
  try {
    if (tokenId) {
      data = await buildERC721TransactionData(transaction, provider);
      if (!data) return DEFAULT_GAS_LIMIT;
      to = contractAddress;
    } else if (!data && contractAddress && symbol !== ETH) {
      /**
       * we check `symbol !== ETH` because our assets list also includes ETH contract address
       * so want to check if it's also not ETH send flow
       */
      const contractAmount = parseTokenBigNumberAmount(amount, defaultDecimals);
      data = encodeContractMethod(ERC20_CONTRACT_ABI, 'transfer', [to, contractAmount]);
      to = contractAddress;
    }
  } catch (e) {
    return DEFAULT_GAS_LIMIT;
  }
  // all parameters are required in order to estimate gas limit precisely
  return provider.estimateGas({
    from,
    to,
    data,
    value,
  })
    .then(calculatedGasLimit =>
      Math.round(EthersBigNumber.from(calculatedGasLimit).toNumber() * 1.5), // safe buffer multiplier
    )
    .catch(() => DEFAULT_GAS_LIMIT);
}

export const getContract = (
  address: string,
  abi: string,
  // for wallet calls set wallet provider, for general purpose use default
  provider: Object = getEthereumProvider(getEnv().NETWORK_PROVIDER),
) => {
  try {
    return new Contract(address, abi, provider);
  } catch (error) {
    reportLog('Failed to create Contract', { error });
    return null;
  }
};

export const buildERC20ApproveTransactionData = (
  spenderAddress: string,
  amount: string,
  decimals: number,
): string => {
  const contractAmount = parseTokenBigNumberAmount(amount, decimals);
  return encodeContractMethod(ERC20_CONTRACT_ABI, 'approve', [spenderAddress, contractAmount]);
};
