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
import * as React from 'react';
import { storiesOf } from '@storybook/react-native';
import { ActivityFeedItem as ActivityFeedItemNoTheme } from 'components/ActivityFeed/ActivityFeedItem';

import { COLLECTIBLE_TRANSACTION } from 'constants/collectiblesConstants';
import { TRANSACTION_EVENT, TX_FAILED_STATUS, TX_PENDING_STATUS } from 'constants/historyConstants';
import {
  PAYMENT_NETWORK_ACCOUNT_DEPLOYMENT,
  PAYMENT_NETWORK_ACCOUNT_TOPUP,
  PAYMENT_NETWORK_ACCOUNT_WITHDRAWAL,
  PAYMENT_NETWORK_TX_SETTLEMENT,
} from 'constants/paymentNetworkConstants';
import { ACCOUNT_TYPES } from 'constants/accountsConstants';
import { USER_EVENT, PPN_INIT_EVENT, WALLET_CREATE_EVENT, WALLET_BACKUP_EVENT } from 'constants/userEventsConstants';
import { SET_ARCHANOVA_WALLET_ACCOUNT_ENS } from 'constants/archanovaConstants';
import {
  POOLTOGETHER_WITHDRAW_TRANSACTION,
  POOLTOGETHER_DEPOSIT_TRANSACTION,
} from 'constants/poolTogetherConstants';
import {
  RARI_DEPOSIT_TRANSACTION,
  RARI_WITHDRAW_TRANSACTION,
  RARI_TRANSFER_TRANSACTION,
  RARI_CLAIM_TRANSACTION,
  RARI_POOLS,
} from 'constants/rariConstants';
import {
  LIQUIDITY_POOLS_ADD_LIQUIDITY_TRANSACTION,
  LIQUIDITY_POOLS_REMOVE_LIQUIDITY_TRANSACTION,
  LIQUIDITY_POOLS_STAKE_TRANSACTION,
  LIQUIDITY_POOLS_UNSTAKE_TRANSACTION,
  LIQUIDITY_POOLS_REWARDS_CLAIM_TRANSACTION,
  LIQUIDITY_POOLS,
} from 'constants/liquidityPoolsConstants';
import { withTheme } from 'styled-components/native';
import WithThemeDecorator from '../../../storybook/WithThemeDecorator';


const placeholderImage = 'https://picsum.photos/200';

const reduxData = {
  assetDecimals: 18,
  ensRegistry: {
    '0x111111': 'john',
  },
  activeAccountAddress: '0x000000',
  selectEvent: () => {},
  activeBlockchainNetwork: '',
  isSmartWalletActivated: false,
  accounts: [],
  supportedAssets: [],
};

const dataForAllAccounts = {
  ...reduxData,
  activeAccountAddress: '0xKeyWallet',
  accounts: [
    {
      id: '0xKeyWallet',
      type: 'KEY_BASED',
      isActive: false,
    },
    {
      id: '0xSmartWallet',
      type: 'SMART_WALLET',
      isActive: true,
      extra:
        {
          ensName: null,
          address: '0xDb5Da19Bcf2754Acc9f706E4e75b9666D2097199',
        },
    },
  ],
};

const ActivityFeedItem = withTheme(ActivityFeedItemNoTheme);

storiesOf('ActivityFeedItem', module)
  .addDecorator(WithThemeDecorator)
  .add('Key wallet created', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{ type: USER_EVENT, subType: WALLET_CREATE_EVENT, eventTitle: 'Wallet created' }}
    />
  ))
  .add('Smart wallet created', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{ type: USER_EVENT, subType: WALLET_CREATE_EVENT, eventTitle: 'Smart Wallet created' }}
    />
  ))
  .add('Key wallet imported', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{ type: USER_EVENT, subType: WALLET_CREATE_EVENT, eventTitle: 'Wallet imported' }}
    />
  ))
  .add('PPN created', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{ type: USER_EVENT, subType: PPN_INIT_EVENT }}
    />
  ))
  .add('Collectible received', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: COLLECTIBLE_TRANSACTION,
        to: '0x000000',
        from: '0x123456',
        icon: placeholderImage,
        asset: 'CryptoKitty',
        assetData: { image: placeholderImage },
      }}
    />
  ))
  .add('Collectible sent', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: COLLECTIBLE_TRANSACTION,
        from: '0x000000',
        to: '0x123465',
        icon: placeholderImage,
        asset: 'CryptoKitty',
        assetData: { image: placeholderImage },
      }}
    />
  ))
  .add('Key wallet incoming', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        from: '0x222222',
        to: '0x000000',
        accountType: ACCOUNT_TYPES.KEY_BASED,
        asset: 'ETH',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('Key wallet incoming pending', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        from: '0x222222',
        to: '0x000000',
        accountType: ACCOUNT_TYPES.KEY_BASED,
        asset: 'ETH',
        value: '1000000000000000000',
        status: TX_PENDING_STATUS,
      }}
    />
  ))
  .add('Key wallet outgoing', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        to: '0x000000',
        from: '0x222222',
        accountType: ACCOUNT_TYPES.KEY_BASED,
        asset: 'ETH',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('Key wallet outgoing pending', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        to: '0x000000',
        from: '0x222222',
        accountType: ACCOUNT_TYPES.KEY_BASED,
        asset: 'ETH',
        value: '1000000000000000000',
        status: TX_PENDING_STATUS,
      }}
    />
  ))
  .add('Key wallet incoming contact', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        from: '0x111111',
        to: '0x000000',
        accountType: ACCOUNT_TYPES.KEY_BASED,
        asset: 'ETH',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('Key wallet outgoing contact', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        to: '0x111111',
        from: '0x000000',
        accountType: ACCOUNT_TYPES.KEY_BASED,
        asset: 'ETH',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('Smart wallet incoming', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        from: '0x000000',
        to: '0x222222',
        accountType: ACCOUNT_TYPES.ARCHANOVA_SMART_WALLET,
        asset: 'ETH',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('Smart wallet incoming pending', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        from: '0x000000',
        to: '0x222222',
        accountType: ACCOUNT_TYPES.ARCHANOVA_SMART_WALLET,
        asset: 'ETH',
        value: '1000000000000000000',
        status: TX_PENDING_STATUS,
      }}
    />
  ))
  .add('Smart wallet outgoing', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        to: '0x000000',
        from: '0x222222',
        accountType: ACCOUNT_TYPES.ARCHANOVA_SMART_WALLET,
        asset: 'ETH',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('Smart wallet outgoing pending', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        to: '0x000000',
        from: '0x222222',
        accountType: ACCOUNT_TYPES.ARCHANOVA_SMART_WALLET,
        asset: 'ETH',
        value: '1000000000000000000',
        status: TX_PENDING_STATUS,
      }}
    />
  ))
  .add('Smart wallet incoming contact', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        from: '0x111111',
        to: '0x000000',
        accountType: ACCOUNT_TYPES.ARCHANOVA_SMART_WALLET,
        asset: 'ETH',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('Smart wallet outgoing contact', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        to: '0x111111',
        from: '0x000000',
        accountType: ACCOUNT_TYPES.ARCHANOVA_SMART_WALLET,
        asset: 'ETH',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('Synthetic sent', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        to: '0x111111',
        from: '0x000000',
        asset: 'PLR',
        value: '1000000000000000000',
        isPPNTransaction: true,
      }}
    />
  ))
  .add('Synthetic sent Failed', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        to: '0x111111',
        from: '0x000000',
        asset: 'PLR',
        value: '1000000000000000000',
        isPPNTransaction: true,
        status: TX_FAILED_STATUS,
      }}
    />
  ))
  .add('Synthetic received', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        from: '0x111111',
        to: '0x000000',
        asset: 'PLR',
        value: '1000000000000000000',
        isPPNTransaction: true,
      }}
    />
  ))
  .add('Settlement', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: PAYMENT_NETWORK_TX_SETTLEMENT,
        from: '0x111111',
        to: '0x000000',
        extra: [{
          symbol: 'PLR',
          value: '1000000000000000000',
        }, {
          symbol: 'PLR',
          value: '2000000000000000000',
        }],
      }}
    />
  ))
  .add('PPN top up', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: PAYMENT_NETWORK_ACCOUNT_TOPUP,
        asset: 'PLR',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('PPN withdrawal', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: PAYMENT_NETWORK_ACCOUNT_WITHDRAWAL,
        asset: 'PLR',
        value: '1000000000000000000',
      }}
    />
  ))
  .add('ENS registration', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
      type: TRANSACTION_EVENT,
      tag: SET_ARCHANOVA_WALLET_ACCOUNT_ENS,
    }}
    />
  ))
  .add('SW activated', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: PAYMENT_NETWORK_ACCOUNT_DEPLOYMENT,
        asset: 'ETH',
        value: '1000000000000000000',
        from: '0x000000',
      }}
    />
  ))
  .add('Wallet backup', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: USER_EVENT,
        subType: WALLET_BACKUP_EVENT,
      }}
    />
  ))
  .add('Collectible sent from KW to SW', () => (
    <ActivityFeedItem
      {...dataForAllAccounts}
      isForAllAccounts
      event={{
        type: COLLECTIBLE_TRANSACTION,
        from: '0xKeyWallet',
        to: '0xSmartWallet',
        icon: placeholderImage,
        asset: 'CryptoKitty',
        assetData: { image: placeholderImage },
      }}
    />
  ))

  .add('Collectible received in SW from KW', () => (
    <ActivityFeedItem
      {...dataForAllAccounts}
      isForAllAccounts
      event={{
        type: COLLECTIBLE_TRANSACTION,
        from: '0xKeyWallet',
        to: '0xSmartWallet',
        icon: placeholderImage,
        asset: 'CryptoKitty',
        isReceived: true,
        assetData: { image: placeholderImage },
      }}
    />
  ))
  .add('Collectible sent to KW when in SW asset screen', () => (
    <ActivityFeedItem
      {...reduxData}
      accounts={[
        {
          id: '0xKeyWallet',
          type: 'KEY_BASED',
          isActive: false,
        },
      ]}
      event={{
        type:
        COLLECTIBLE_TRANSACTION,
        from: '0x000000',
        to: '0xKeyWallet',
        icon: placeholderImage,
        asset: 'CryptoKitty',
        username: 'Key wallet',
        assetData: { image: placeholderImage },
      }}
    />
  ))
  .add('Collectible received from KW when in SW asset screen', () => (
    <ActivityFeedItem
      {...reduxData}
      accounts={[
        {
          id: '0xKeyWallet',
          type: 'KEY_BASED',
          isActive: false,
        },
      ]}
      event={{
        type:
        COLLECTIBLE_TRANSACTION,
        to: '0x000000',
        from: '0xKeyWallet',
        icon: placeholderImage,
        asset: 'CryptoKitty',
        username: 'Key wallet',
        assetData: { image: placeholderImage },
      }}
    />
  ))
  .add('Collectible sent to SW when in KW asset screen', () => (
    <ActivityFeedItem
      {...reduxData}
      activeAccountAddress="0xKeyWallet"
      accounts={[
        {
          id: '0xSmartWallet',
          type: 'SMART_WALLET',
          isActive: false,
        },
      ]}
      event={{
        type:
        COLLECTIBLE_TRANSACTION,
        to: '0xSmartWallet',
        from: '0xKeyWallet',
        icon: placeholderImage,
        asset: 'CryptoKitty',
        username: 'Smart Wallet',
        assetData: { image: placeholderImage },
      }}
    />
  ))
  .add('Collectible received from SW when in KW asset screen', () => (
    <ActivityFeedItem
      {...reduxData}
      activeAccountAddress="0xKeyWallet"
      accounts={[
        {
          id: '0xSmartWallet',
          type: 'SMART_WALLET',
          isActive: false,
        },
      ]}
      event={{
        type:
        COLLECTIBLE_TRANSACTION,
        from: '0xSmartWallet',
        to: '0xKeyWallet',
        icon: placeholderImage,
        asset: 'CryptoKitty',
        username: 'Smart Wallet',
        assetData: { image: placeholderImage },
      }}
    />
  ))
  .add('PoolTogether deposit DAI', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: POOLTOGETHER_DEPOSIT_TRANSACTION,
        extra: {
          symbol: 'DAI',
          decimals: 18,
          amount: '1000000000000000000',
        },
      }}
    />
  ))
  .add('PoolTogether deposit USDC', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: POOLTOGETHER_DEPOSIT_TRANSACTION,
        extra: {
          symbol: 'USDC',
          decimals: 18,
          amount: '1000000000000000000',
        },
      }}
    />
  ))
  .add('PoolTogether withdraw DAI', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: POOLTOGETHER_WITHDRAW_TRANSACTION,
        extra: {
          symbol: 'DAI',
          decimals: 18,
          amount: '1000000000000000000',
        },
      }}
    />
  ))
  .add('PoolTogether withdraw USDC', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: POOLTOGETHER_WITHDRAW_TRANSACTION,
        extra: {
          symbol: 'USDC',
          decimals: 18,
          amount: '1000000000000000000',
        },
      }}
    />
  ))
  .add('Rari deposit', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: RARI_DEPOSIT_TRANSACTION,
        extra: {
          symbol: 'USDC',
          decimals: 6,
          amount: '1000000',
          rariPool: RARI_POOLS.STABLE_POOL,
          rftMinted: '1000000000000000000',
        },
      }}
    />
  ))
  .add('Rari withdrawal', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: RARI_WITHDRAW_TRANSACTION,
        extra: {
          symbol: 'USDC',
          decimals: 6,
          amount: '1000000',
          rariPool: RARI_POOLS.STABLE_POOL,
          rftBurned: '1000000000000000000',
        },
      }}
    />
  ))
  .add('Rari claim', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: RARI_CLAIM_TRANSACTION,
        extra: {
          amount: '1000000000000000000',
          rgtBurned: '300000000000000000',
        },
      }}
    />
  ))
  .add('Rari transfer', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: RARI_TRANSFER_TRANSACTION,
        extra: {
          amount: '1000000000000000000',
          rariPool: RARI_POOLS.STABLE_POOL,
          contactAddress: '0x000000',
        },
      }}
    />
  ))
  .add('Rari pending transaction', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: RARI_DEPOSIT_TRANSACTION,
        extra: {
          symbol: 'USDC',
          decimals: 6,
          amount: '1000000',
          rariPool: RARI_POOLS.STABLE_POOL,
        },
        status: TX_PENDING_STATUS,
      }}
    />
  ))
  .add('Liquidity added', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: LIQUIDITY_POOLS_ADD_LIQUIDITY_TRANSACTION,
        extra: {
          amount: 12.3,
          pool: LIQUIDITY_POOLS()[0],
        },
      }}
    />
  ))
  .add('Liquidity removed', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: LIQUIDITY_POOLS_REMOVE_LIQUIDITY_TRANSACTION,
        extra: {
          amount: 12.3,
          pool: LIQUIDITY_POOLS()[0],
        },
      }}
    />
  ))
  .add('Liquidity staked', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: LIQUIDITY_POOLS_STAKE_TRANSACTION,
        extra: {
          amount: 12.3,
          pool: LIQUIDITY_POOLS()[0],
        },
      }}
    />
  ))
  .add('Liquidity unstaked', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: LIQUIDITY_POOLS_UNSTAKE_TRANSACTION,
        extra: {
          amount: 12.3,
          pool: LIQUIDITY_POOLS()[0],
        },
      }}
    />
  ))
  .add('Liquidity rewards claimed', () => (
    <ActivityFeedItem
      {...reduxData}
      event={{
        type: TRANSACTION_EVENT,
        tag: LIQUIDITY_POOLS_REWARDS_CLAIM_TRANSACTION,
        extra: {
          amount: 12.3,
          pool: LIQUIDITY_POOLS()[0],
        },
      }}
    />
  ));

