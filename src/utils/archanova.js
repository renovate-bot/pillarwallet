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
import isEmpty from 'lodash.isempty';
import get from 'lodash.get';
import { sdkConstants, sdkInterfaces } from '@smartwallet/sdk';
import { BigNumber } from 'bignumber.js';
import t from 'translations/translate';
import { Migrator } from '@etherspot/archanova-migrator';
import { utils, Wallet } from 'ethers';
import { getEnv } from 'configs/envConfig';

// constants
import {
  SET_ARCHANOVA_WALLET_ACCOUNT_ENS,
  ARCHANOVA_WALLET_ACCOUNT_DEVICE_ADDED,
  ARCHANOVA_WALLET_ACCOUNT_DEVICE_REMOVED,
  ARCHANOVA_WALLET_DEPLOYMENT_ERRORS,
  ARCHANOVA_WALLET_SWITCH_TO_GAS_TOKEN_RELAYER,
  ARCHANOVA_WALLET_UPGRADE_STATUSES,
} from 'constants/archanovaConstants';
import { ACCOUNT_TYPES } from 'constants/accountsConstants';
import {
  TX_CONFIRMED_STATUS,
  TX_FAILED_STATUS,
  TX_PENDING_STATUS,
  TX_TIMEDOUT_STATUS,
} from 'constants/historyConstants';
import {
  PAYMENT_NETWORK_ACCOUNT_TOPUP,
  PAYMENT_NETWORK_ACCOUNT_WITHDRAWAL,
  PAYMENT_NETWORK_ACCOUNT_DEPLOYMENT,
  PAYMENT_NETWORK_TX_SETTLEMENT,
} from 'constants/paymentNetworkConstants';
import { ETH } from 'constants/assetsConstants';
import { RARI_TOKENS_DATA } from 'constants/rariConstants';

// services
import archanovaService, { parseEstimatePayload } from 'services/archanova';

// types
import type { Account } from 'models/Account';
import type { ArchanovaWalletStatus } from 'models/ArchanovaWalletStatus';
import type {
  TransactionFeeInfo,
  Transaction,
  TransactionExtra,
  GasToken,
} from 'models/Transaction';
import type { Asset } from 'models/Asset';
import type { SmartWalletReducerState } from 'reducers/smartWalletReducer';
import type { ArchanovaEstimatePayload, ArchanovaTransactionEstimate } from 'services/archanova';
import type { TranslatedString } from 'models/Translations';

// utils
import {
  findFirstArchanovaAccount,
  findFirstEtherspotAccount,
  getAccountAddress,
  getAccountEnsName,
  getActiveAccount,
  isArchanovaAccount,
} from './accounts';
import { addressesEqual, getAssetDataByAddress, getAssetSymbolByAddress } from './assets';
import { isCaseInsensitiveMatch, reportErrorLog } from './common';
import { buildHistoryTransaction, parseFeeWithGasToken } from './history';


type IAccountTransaction = sdkInterfaces.IAccountTransaction;
type IAccountDevice = sdkInterfaces.IAccountDevice;
const AccountTransactionTypes = { ...sdkConstants.AccountTransactionTypes };

const getMessage = (
  status: ?string,
  isArchanovaWalletActive: boolean,
): { title?: TranslatedString, message?: TranslatedString } => {
  switch (status) {
    case ARCHANOVA_WALLET_UPGRADE_STATUSES.ACCOUNT_CREATED:
      if (!isArchanovaWalletActive) return {};
      return {
        title: t('insight.smartWalletActivate.default.title'),
        message: t('insight.smartWalletActivate.default.description'),
      };
    case ARCHANOVA_WALLET_UPGRADE_STATUSES.DEPLOYING:
      if (!isArchanovaWalletActive) return {};
      // TODO: get average time
      return {
        title: t('insight.smartWalletActivate.isBeingDeployed.title'),
        message: t('insight.smartWalletActivate.isBeingDeployed.description.waitingTime', { waitingTimeInMinutes: 4 }),
      };
    default:
      return {};
  }
};

export const getArchanovaWalletStatus = (
  accounts: Account[],
  smartWalletState: SmartWalletReducerState,
): ArchanovaWalletStatus => {
  const activeAccount = getActiveAccount(accounts);
  const hasAccount = !isArchanovaAccount(activeAccount);

  const isSmartWalletActive = !!activeAccount && activeAccount.type === ACCOUNT_TYPES.ARCHANOVA_SMART_WALLET;

  const status = smartWalletState?.upgrade?.status;
  const sendingBlockedMessage = getMessage(status, isSmartWalletActive);

  return {
    hasAccount,
    status,
    sendingBlockedMessage,
  };
};

export const isConnectedToArchanovaSmartAccount = (connectedAccountRecord: ?Object) => !isEmpty(connectedAccountRecord);

export const getDeployErrorMessage = (errorType: string) => ({
  title: t('insight.smartWalletActivate.activationFailed.title'),
  message: errorType === ARCHANOVA_WALLET_DEPLOYMENT_ERRORS.INSUFFICIENT_FUNDS
    ? t('insight.smartWalletActivate.activationFailed.error.needToSetupSmartAccount')
    : t('insight.smartWalletActivate.activationFailed.error.default'),
});

export const isArchanovaDeviceDeployed = (
  device: ?$Shape<{ state: ?string, nextState: ?string }>,
): boolean => [get(device, 'state'), get(device, 'nextState')]
  .includes(sdkConstants.AccountDeviceStates.Deployed);

export const deviceHasGasTokenSupport = (device: IAccountDevice): boolean => {
  return !!get(device, 'features.gasTokenSupported');
};

export const accountHasGasTokenSupport = (account: Object): boolean => {
  if (isEmpty(get(account, 'devices', []))) return false;
  return account.devices.some(device => deviceHasGasTokenSupport(device) && isArchanovaDeviceDeployed(device));
};

const extractAddress = details => get(details, 'account.address', '') || get(details, 'address', '');

export const getGasTokenDetails = (assets: Asset[], supportedAssets: Asset[], gasTokenAddress: string): ?GasToken => {
  const assetData = getAssetDataByAddress(assets, supportedAssets, gasTokenAddress);
  if (isEmpty(assetData)) return null;

  const { decimals, symbol, address } = assetData;
  return { decimals, symbol, address };
};

export const parseArchanovaTransactionStatus = (sdkStatus: sdkConstants.AccountTransactionStates): string => {
  switch (sdkStatus) {
    case sdkConstants.AccountTransactionStates.Completed:
      return TX_CONFIRMED_STATUS;
    case sdkConstants.AccountTransactionStates.Failed:
      return TX_FAILED_STATUS;
    case sdkConstants.AccountTransactionStates.DroppedOrReplaced:
      return TX_TIMEDOUT_STATUS;
    default:
      return TX_PENDING_STATUS;
  }
};

export const parseArchanovaTransactions = (
  archanovaTransactions: IAccountTransaction[],
  supportedAssets: Asset[],
  assets: Asset[],
  relayerExtensionAddress: ?string,
): Transaction[] => archanovaTransactions
  .reduce((mapped, smartWalletTransaction) => {
    const {
      hash,
      from: fromDetails,
      to: toDetails,
      updatedAt, // SDK does not provide createdAt, only updatedAt
      state,
      tokenRecipient,
      tokenAddress,
      value: rawValue,
      transactionType,
      paymentHash,
      tokenValue,
      index,
      gas: {
        used: gasUsed,
        price: gasPrice,
      },
      gasToken: gasTokenAddress,
      fee: transactionFee,
    } = smartWalletTransaction;

    // NOTE: same transaction could have multiple records, those are different by index
    // we always leave only one record with the biggest index number
    const sameHashTransactions = archanovaTransactions.filter(tx => isCaseInsensitiveMatch(tx.hash, hash));
    if (sameHashTransactions.length > 1) { // don't count current transaction
      const maxIndex = Math.max(...sameHashTransactions.map(tx => tx.index));
      if (index < maxIndex) {
        // don't store transactions with lover index
        return mapped;
      }
    }

    const from = extractAddress(fromDetails);

    let to = extractAddress(toDetails);
    if (transactionType === AccountTransactionTypes.Erc20Transfer) {
      to = tokenRecipient || '';
    }

    // ignore some transaction types
    if (transactionType === AccountTransactionTypes.TopUpErc20Approve) return mapped;

    const status = parseArchanovaTransactionStatus(state);
    let value = tokenAddress ? tokenValue : rawValue;
    value = new BigNumber(value.toString());

    let transaction = {
      from: from || '',
      to: to || '',
      hash,
      value,
      createdAt: +new Date(updatedAt) / 1000,
      asset: ETH,
      status,
      gasPrice: gasPrice.toNumber(),
      gasLimit: gasUsed.toNumber(),
    };

    if (tokenAddress) {
      const symbol = getAssetSymbolByAddress(assets, supportedAssets, tokenAddress);
      if (symbol) {
        transaction.asset = symbol;
      } else {
        // Rari tokens are not supported yet but we want events with rari tokens
        const rariToken = (Object.values(RARI_TOKENS_DATA): any)
          .find(token => token.contractAddress === tokenAddress)?.symbol;
        if (rariToken) {
          transaction.asset = rariToken;
        } else {
          return mapped; // skip non-supported assets
        }
      }
    }

    if (transactionType === AccountTransactionTypes.Settlement) {
      // get and process all transactions with the same hash
      const extra = sameHashTransactions.map(tx => {
        const txAsset = getAssetSymbolByAddress(assets, supportedAssets, tx.tokenAddress) || ETH;
        const txValue = tx.tokenValue.toString();
        return {
          symbol: txAsset,
          value: txValue,
          hash: tx.paymentHash,
        };
      });

      transaction = {
        ...transaction,
        value: '0',
        tag: PAYMENT_NETWORK_TX_SETTLEMENT,
        asset: PAYMENT_NETWORK_TX_SETTLEMENT,
        extra,
      };
    } else if (transactionType === AccountTransactionTypes.Withdrawal) {
      transaction = {
        ...transaction,
        tag: PAYMENT_NETWORK_ACCOUNT_WITHDRAWAL,
        extra: {
          paymentHash,
        },
      };
    } else if (transactionType === AccountTransactionTypes.TopUp) {
      transaction = {
        ...transaction,
        tag: PAYMENT_NETWORK_ACCOUNT_TOPUP,
      };
    } else if (transactionType === AccountTransactionTypes.AccountDeployment) {
      transaction = {
        ...transaction,
        tag: PAYMENT_NETWORK_ACCOUNT_DEPLOYMENT,
      };
    } else if (transactionType === AccountTransactionTypes.UpdateAccountEnsName) {
      transaction = {
        ...transaction,
        tag: SET_ARCHANOVA_WALLET_ACCOUNT_ENS,
        extra: {
          ensName: get(fromDetails, 'account.ensName'),
        },
      };
    } else if (transactionType === AccountTransactionTypes.AddDevice) {
      const addedDeviceAddress = get(smartWalletTransaction, 'extra.address');
      if (!isEmpty(addedDeviceAddress)) {
        const tag = addressesEqual(addedDeviceAddress, relayerExtensionAddress)
          ? ARCHANOVA_WALLET_SWITCH_TO_GAS_TOKEN_RELAYER
          : ARCHANOVA_WALLET_ACCOUNT_DEVICE_ADDED;
        transaction = { ...transaction, tag };
      }
    } else if (transactionType === AccountTransactionTypes.RemoveDevice) {
      transaction = {
        ...transaction,
        tag: ARCHANOVA_WALLET_ACCOUNT_DEVICE_REMOVED,
      };
    }

    if (!isEmpty(gasTokenAddress) && transactionFee) {
      // TODO: this should be returned from the backend
      const gasToken = getGasTokenDetails(assets, supportedAssets, gasTokenAddress);
      if (!isEmpty(gasToken)) {
        const feeWithGasToken = parseFeeWithGasToken(gasToken, transactionFee);
        transaction = { ...transaction, feeWithGasToken };
      }
    }

    const mappedTransaction = buildHistoryTransaction(transaction);
    mapped.push(mappedTransaction);

    return mapped;
  }, []);

export const transactionExtraContainsPaymentHash = (paymentHash: string, extra: TransactionExtra): boolean => {
  if (isEmpty(extra)) return false;
  // extra can be either object or array
  // $FlowFixMe
  return (!Array.isArray(extra) && isCaseInsensitiveMatch(extra.paymentHash, paymentHash))
    || (Array.isArray(extra) && extra.some(({ hash }) => isCaseInsensitiveMatch(hash, paymentHash)));
};

const paymentNetworkHiddenUnsettledTags = [
  PAYMENT_NETWORK_ACCOUNT_WITHDRAWAL,
  PAYMENT_NETWORK_TX_SETTLEMENT,
];

// hiding unsettled transactions that were just settled and are pending
// hiding withdraw payment transaction if withdraw is pending
export const isHiddenUnsettledTransaction = (
  paymentHash: string,
  history: Transaction[],
): boolean => history
  .filter(({ status }) => status === TX_PENDING_STATUS)
  .some(({ tag, extra }) => extra
    && transactionExtraContainsPaymentHash(paymentHash, extra)
    && paymentNetworkHiddenUnsettledTags.includes(tag),
  );

export const isDeployingArchanovaWallet = (smartWalletState: SmartWalletReducerState, accounts: Account[]) => {
  const { upgrade: { deploymentStarted, deploymentData: { error } } } = smartWalletState;
  const archanovaWalletStatus: ArchanovaWalletStatus = getArchanovaWalletStatus(accounts, smartWalletState);
  return !error && (deploymentStarted || archanovaWalletStatus.status === ARCHANOVA_WALLET_UPGRADE_STATUSES.DEPLOYING);
};

export const getDeploymentData = (smartWalletState: SmartWalletReducerState) => {
  return get(smartWalletState, 'upgrade.deploymentData', {});
};

export const getDeploymentHash = (smartWalletState: SmartWalletReducerState) => {
  return get(smartWalletState, 'upgrade.deploymentData.hash', '');
};

export const buildArchanovaTransactionEstimate = (apiEstimate: ArchanovaEstimatePayload) => {
  const {
    gasAmount,
    gasPrice,
    totalCost,
    gasTokenCost,
    gasToken,
  } = parseEstimatePayload(apiEstimate);

  let estimate = {
    gasAmount,
    gasPrice,
    totalCost,
  };

  // check if fee by gas token available
  const hasGasTokenSupport = get(apiEstimate, 'relayerFeatures.gasTokenSupported', false);
  if (!hasGasTokenSupport) return estimate;

  const parsedGasTokenCost = new BigNumber(gasTokenCost ? gasTokenCost.toString() : 0);

  if (gasTokenCost && gasTokenCost.gt(0)) {
    estimate = {
      ...estimate,
      gasToken,
      gasTokenCost: parsedGasTokenCost,
    };
  }

  return estimate;
};

export const buildArchanovaTxFeeInfo = (
  estimated: ?ArchanovaTransactionEstimate,
  useGasToken: boolean,
): TransactionFeeInfo => {
  if (!estimated) return { fee: null };

  const { gasTokenCost, gasToken, ethCost } = estimated;

  if (!useGasToken || !gasToken) {
    return { fee: ethCost };
  }

  return {
    fee: gasTokenCost,
    gasToken,
  };
};

export const buildEnsMigrationRawTransactions = async (accounts: Account[], wallet: Wallet): Promise<?(string[])> => {
  const isKovan = getEnv().NETWORK_PROVIDER === 'kovan';

  const etherspotAccount = findFirstEtherspotAccount(accounts);
  const archanovaAccount = findFirstArchanovaAccount(accounts);

  if (!etherspotAccount || !archanovaAccount) return null;

  let migrator = new Migrator({
    chainId: isKovan ? 42 : 1,
    archanovaAccount: getAccountAddress(archanovaAccount),
    etherspotAccount: getAccountAddress(etherspotAccount),
  });

  const { migratorAddress } = migrator;
  const connectedAccountDevices = await archanovaService.getConnectedAccountDevices();

  const isMigratorDeviceAdded = connectedAccountDevices.some(({
    device,
  }) => addressesEqual(device?.address, migratorAddress));

  if (!isMigratorDeviceAdded) {
    await archanovaService.addAccountDevice(migratorAddress);
    migrator = migrator.addAccountDevice();
  }

  // we cannot test ENS migration so let's just add simple transaction
  migrator = isKovan
    ? migrator.transferBalance(utils.parseEther('0.001'))
    : migrator.transferENSName(utils.namehash(getAccountEnsName(archanovaAccount)));

  const archanovaAccountDeviceSignature = await wallet.signMessage(migrator.migrationMessage);

  if (!archanovaAccountDeviceSignature) return null;

  return migrator
    .encodeTransactionRequests(archanovaAccountDeviceSignature)
    .map(({ data, to }) => {
      if (addressesEqual(to, migratorAddress)) {
        // Jegor's provided fix
        try {
          const { account } = archanovaService.getSdk().contract;
          // eslint-disable-next-line i18next/no-literal-string
          return account.encodeMethodInput('executeTransaction', to, 0, data);
        } catch (error) {
          reportErrorLog('buildEnsMigrationRawTransactions -> encodeMethodInput failed', {
            error,
            encodedTransactionRequest: { to, data },
            migratorAddress,
            archanovaAccount,
            etherspotAccount,
          });
        }
      }

      return data;
    });
};
