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
import {
  SET_FETCHING_LIQUIDITY_POOLS_DATA,
  SET_UNIPOOL_DATA,
  SET_UNISWAP_POOL_DATA,
  SET_LIQUIDITY_POOLS_GRAPH_QUERY_ERROR,
  SET_SHOWN_STAKING_ENABLED_MODAL,
} from 'constants/liquidityPoolsConstants';
import { LIQUIDITY_POOLS_TYPES } from 'models/LiquidityPools';
import {
  getStakedAmount,
  getEarnedAmount,
} from 'utils/unipool';
import {
  getAddLiquidityTransactions,
  fetchPoolData,
  getRemoveLiquidityTransactions,
  getStakeTransactions,
  getUnstakeTransaction,
  getClaimRewardsTransaction,
} from 'utils/liquidityPools';
import { findFirstEtherspotAccount, getAccountAddress } from 'utils/accounts';
import { reportErrorLog } from 'utils/common';
import {
  estimateTransactionAction,
  estimateTransactionsAction,
  setEstimatingTransactionAction,
} from 'actions/transactionEstimateActions';
import { GraphQueryError } from 'services/theGraph';
import Toast from 'components/Toast';
import t from 'translations/translate';
import type { Dispatch, GetState } from 'reducers/rootReducer';
import type { Asset } from 'models/Asset';
import type { LiquidityPool } from 'models/LiquidityPools';


const fetchUnipoolUserDataAction = (unipoolAddress: string) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    const {
      accounts: { data: accounts },
    } = getState();
    const smartWalletAccount = findFirstEtherspotAccount(accounts);
    if (!smartWalletAccount) return;

    const [stakedAmount, earnedAmount] = await Promise.all([
      getStakedAmount(unipoolAddress, getAccountAddress(smartWalletAccount)),
      getEarnedAmount(unipoolAddress, getAccountAddress(smartWalletAccount)),
    ]).catch(error => {
      reportErrorLog('Unipool service failed', { error });
      Toast.show({
        message: t('toast.poolDataFetchFailed'),
        emoji: 'hushed',
        supportLink: true,
      });
      return [];
    });

    if (stakedAmount && earnedAmount) {
      dispatch({
        type: SET_UNIPOOL_DATA,
        payload: {
          unipoolAddress,
          data: {
            stakedAmount,
            earnedAmount,
          },
        },
      });
    }
  };
};

const fetchUniswapPoolDataAction = (poolAddress: string) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    const {
      accounts: { data: accounts },
    } = getState();
    const smartWalletAccount = findFirstEtherspotAccount(accounts);
    if (!smartWalletAccount) return;

    const poolData = await fetchPoolData(poolAddress, getAccountAddress(smartWalletAccount))
      .catch(error => {
        if (error instanceof GraphQueryError) {
          dispatch({
            type: SET_LIQUIDITY_POOLS_GRAPH_QUERY_ERROR,
          });
        } else {
          reportErrorLog("Liquidity pools service failed: Can't fetch pool data", { error });
          Toast.show({
            message: t('toast.poolDataFetchFailed'),
            emoji: 'hushed',
            supportLink: true,
          });
        }
        return null;
      });
    if (poolData) {
      dispatch({
        type: SET_UNISWAP_POOL_DATA,
        payload: {
          poolAddress,
          data: poolData,
        },
      });
    }
  };
};

export const fetchLiquidityPoolsDataAction = (pools: LiquidityPool[]) => {
  return async (dispatch: Dispatch) => {
    dispatch({ type: SET_FETCHING_LIQUIDITY_POOLS_DATA, payload: true });
    await Promise.all(pools.map(async pool => {
      if (pool.type === LIQUIDITY_POOLS_TYPES.UNIPOOL) {
        await dispatch(fetchUnipoolUserDataAction(pool.unipoolAddress));
      }
      await dispatch(fetchUniswapPoolDataAction(pool.uniswapPairAddress));
    }));
    dispatch({ type: SET_FETCHING_LIQUIDITY_POOLS_DATA, payload: false });
  };
};

export const calculateAddLiquidityTransactionEstimateAction = (
  pool: LiquidityPool,
  tokenAmounts: string[],
  poolTokenAmount: string,
  tokensAssets: Asset[],
) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    const { accounts: { data: accounts } } = getState();
    const smartWalletAccount = findFirstEtherspotAccount(accounts);
    if (!smartWalletAccount) return;

    dispatch(setEstimatingTransactionAction(true));

    const addLiquidityTransactions: ?Object[] = await getAddLiquidityTransactions(
      getAccountAddress(smartWalletAccount),
      pool,
      tokenAmounts,
      poolTokenAmount,
      tokensAssets,
    ).catch(error => {
      reportErrorLog("Liquidity pools service failed: can't create add liquidity transaction", { error });
      return null;
    });

    if (!addLiquidityTransactions) {
      dispatch(setEstimatingTransactionAction(false));

      Toast.show({
        message: t('toast.cannotAddLiquidity'),
        emoji: 'hushed',
        supportLink: true,
      });

      return;
    }

    const transactionDrafts = addLiquidityTransactions.map(({
      to,
      amount: value,
      data,
    }) => ({ to, value, data }));

    dispatch(estimateTransactionsAction(transactionDrafts));
  };
};

export const calculateStakeTransactionEstimateAction = (
  pool: LiquidityPool,
  tokenAmount: string,
  tokenAsset: Asset,
) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    const { accounts: { data: accounts } } = getState();
    const smartWalletAccount = findFirstEtherspotAccount(accounts);
    if (!smartWalletAccount) return;

    dispatch(setEstimatingTransactionAction(true));

    const stakeTransactions: ?Object[] = await getStakeTransactions(
      pool,
      getAccountAddress(smartWalletAccount),
      tokenAmount,
      tokenAsset,
    ).catch(error => {
      reportErrorLog("Liquidity pools service failed: can't create stake transaction", { error });
      return null;
    });

    if (!stakeTransactions) {
      dispatch(setEstimatingTransactionAction(false));

      Toast.show({
        message: t('toast.cannotStakeTokens'),
        emoji: 'hushed',
        supportLink: true,
      });

      return;
    }

    const transactionDrafts = stakeTransactions.map(({
      to,
      amount: value,
      data,
    }) => ({ to, value, data }));

    dispatch(estimateTransactionsAction(transactionDrafts));
  };
};

export const calculateUnstakeTransactionEstimateAction = (
  pool: LiquidityPool,
  tokenAmount: string,
) => {
  return (dispatch: Dispatch, getState: GetState) => {
    const { accounts: { data: accounts } } = getState();
    const smartWalletAccount = findFirstEtherspotAccount(accounts);
    if (!smartWalletAccount) return;

    dispatch(setEstimatingTransactionAction(true));

    const { to, amount: value, data } = getUnstakeTransaction(
      pool,
      getAccountAddress(smartWalletAccount),
      tokenAmount,
    );

    dispatch(estimateTransactionAction({ to, value, data }));
  };
};

export const calculateRemoveLiquidityTransactionEstimateAction = (
  pool: LiquidityPool,
  tokenAmount: string,
  poolToken: Asset,
  tokensAssets: Asset[],
  obtainedTokensAmounts: string[],
) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    const { accounts: { data: accounts } } = getState();
    const smartWalletAccount = findFirstEtherspotAccount(accounts);
    if (!smartWalletAccount) return;

    dispatch(setEstimatingTransactionAction(true));

    const removeLiquidityTransactions: ?Object[] = await getRemoveLiquidityTransactions(
      getAccountAddress(smartWalletAccount),
      pool,
      tokenAmount,
      poolToken,
      tokensAssets,
      obtainedTokensAmounts,
    ).catch(error => {
      reportErrorLog("Liquidity pools service failed: can't create remove liquidity transaction", { error });
      return null;
    });

    if (!removeLiquidityTransactions) {
      dispatch(setEstimatingTransactionAction(false));

      Toast.show({
        message: t('toast.cannotRemoveLiquidity'),
        emoji: 'hushed',
        supportLink: true,
      });

      return;
    }

    const transactionDrafts = removeLiquidityTransactions.map(({
      to,
      amount: value,
      data,
    }) => ({ to, value, data }));

    dispatch(estimateTransactionsAction(transactionDrafts));
  };
};

export const calculateClaimRewardsTransactionEstimateAction = (pool: LiquidityPool, amountToClaim: number) => {
  return (dispatch: Dispatch, getState: GetState) => {
    const { accounts: { data: accounts } } = getState();
    const smartWalletAccount = findFirstEtherspotAccount(accounts);
    if (!smartWalletAccount) return;

    dispatch(setEstimatingTransactionAction(true));

    const { to, amount: value, data } = getClaimRewardsTransaction(
      pool,
      getAccountAddress(smartWalletAccount),
      amountToClaim,
    );

    dispatch(estimateTransactionAction({ to, value, data }));
  };
};

export const setShownStakingEnabledModalAction = (poolName: string) => (dispatch: Dispatch) => {
  dispatch({ type: SET_SHOWN_STAKING_ENABLED_MODAL, payload: poolName });
};
