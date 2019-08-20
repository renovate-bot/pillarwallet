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
import { utils } from 'ethers';
import { BigNumber } from 'bignumber.js';
import type { Assets, Balances, Rates } from 'models/Asset';
import { NETWORK_PROVIDER } from 'react-native-dotenv';
import get from 'lodash.get';
import { ETH } from 'constants/assetsConstants';
import { formatAmount } from 'utils/common';

export function transformAssetsToObject(assetsArray: Object[] = []): Object {
  return assetsArray.reduce((memo, asset) => {
    memo[asset.symbol] = asset;
    return memo;
  }, {});
}

export function getBalance(balances: Balances = {}, asset: string = ''): number {
  const number = balances[asset] ? new BigNumber(balances[asset].balance) : 0;
  return +formatAmount(number.toString());
}

export function getRate(rates: Rates = {}, token: string, fiatCurrency: string): number {
  const tokenRates = rates[token];
  const ethRate = rates[ETH];

  if (!tokenRates) {
    return 0;
  }

  if (!ethRate) {
    return tokenRates[fiatCurrency] || 0;
  }

  const ethToFiat = ethRate[fiatCurrency];
  if (!ethToFiat) {
    return 0;
  }

  if (token === ETH) {
    return ethToFiat;
  }

  const tokenToETH = tokenRates[ETH];
  if (!tokenToETH) {
    return tokenRates[fiatCurrency] || 0;
  }

  return ethToFiat * tokenToETH;
}

export function calculateMaxAmount(token: string, balance: number | string, txFeeInWei: BigNumber): number {
  if (typeof balance !== 'string') {
    balance = balance.toString();
  }
  if (token !== ETH) {
    return +balance;
  }
  const maxAmount = utils.parseUnits(balance, 'ether').sub(txFeeInWei);
  if (maxAmount.lt(0)) return 0;
  return new BigNumber(utils.formatEther(maxAmount)).toNumber();
}

export function checkIfEnoughForFee(balances: Balances, txFeeInWei: BigNumber): boolean {
  if (!balances[ETH]) return false;
  const ethBalance = getBalance(balances, ETH);
  const balanceInWei = utils.parseUnits(ethBalance.toString(), 'ether');
  return balanceInWei.gte(txFeeInWei);
}

export function calculatePortfolioBalance(assets: Assets, rates: Rates, balances: Object) {
  // CLEANUP REQUIRED
  return Object
    .keys(assets)
    .map(key => assets[key])
    .map(({ symbol }) => {
      const assetRates = rates[symbol] || {};
      const balance = getBalance(balances, symbol);
      const assetFiatBalance = Object
        .keys(assetRates)
        .map(key => ({
          currency: key,
          total: assetRates[key] * (balance || 0),
        }));
      return assetFiatBalance;
    })
    .reduce((memo, item) => {
      return memo.concat(item);
    }, [])
    .reduce((memo, item) => {
      memo[item.currency] = (memo[item.currency] || 0) + item.total;
      return memo;
    }, { GBP: 0 });
}

export function getPPNTokenAddress(token: string, assets: Assets): ?string {
  if (token === ETH) return null;
  const asset = Object.keys(assets)
    .map(key => assets[key])
    .find(({ symbol }) => symbol === token);
  return get(asset, 'address', '');
}

export function addressesEqual(address1: ?string, address2: ?string) {
  if (address1 === address2) return true;
  if (!address1 || !address2) return false;
  return address1.toLowerCase() === address2.toLowerCase();
}
