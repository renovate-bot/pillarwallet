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
import styled from 'styled-components/native';
import { connect } from 'react-redux';
import get from 'lodash.get';
import { BigNumber } from 'bignumber.js';
import { useState } from 'react';
import { createStructuredSelector } from 'reselect';
import t from 'translations/translate';

// components
import { Label, BaseText } from 'components/Typography';
import Spinner from 'components/Spinner';
import { Spacing } from 'components/Layout';

// constants
import { defaultFiatCurrency, ETH } from 'constants/assetsConstants';

// utils
import { formatTransactionFee, getCurrencySymbol } from 'utils/common';
import { getRate } from 'utils/assets';

// selectors
import { accountAssetsSelector } from 'selectors/assets';
import { accountHistorySelector } from 'selectors/history';

// types
import type { Rates, Assets } from 'models/Asset';
import type { GasToken, Transaction } from 'models/Transaction';
import type { RootReducerState } from 'reducers/rootReducer';


type Props = {
  baseFiatCurrency: ?string,
  rates: Rates,
  txFeeInWei: BigNumber | number,
  gasToken: ?GasToken,
  isLoading?: boolean,
  labelText?: string,
  showFiatDefault?: boolean,
  accountAssets: Assets,
  accountHistory: Transaction[],
  hasError?: boolean,
};

const LabelWrapper = styled.View`
  flex-direction: row;
  align-items: center;
`;

const FeePill = styled.TouchableOpacity`
  ${({ hasError, theme: { colors: { negative, labelTertiary } } }) => `
    background-color: ${hasError ? negative : labelTertiary};
  `}
  padding: 0 8px;
  border-radius: 12px;
  justify-content: center;
`;

const FeeLabelToggle = ({
  txFeeInWei,
  gasToken,
  baseFiatCurrency,
  rates,
  isLoading,
  labelText,
  showFiatDefault,
  hasError,
}: Props) => {
  const [isFiatValueVisible, setIsFiatValueVisible] = useState(showFiatDefault);

  if (isLoading) {
    return <Spinner size={20} trackWidth={2} />;
  }

  const fiatCurrency = baseFiatCurrency || defaultFiatCurrency;
  const feeDisplayValue = formatTransactionFee(txFeeInWei, gasToken);
  const gasTokenSymbol = get(gasToken, 'symbol', ETH);
  const currencySymbol = getCurrencySymbol(fiatCurrency);

  const feeInFiat = parseFloat(feeDisplayValue) * getRate(rates, gasTokenSymbol, fiatCurrency);
  const feeInFiatDisplayValue = `${currencySymbol}${feeInFiat.toFixed(2)}`;
  const labelValue = isFiatValueVisible ? feeInFiatDisplayValue : feeDisplayValue;

  return (
    <LabelWrapper >
      <Label>{labelText || t('label.estimatedFee')}&nbsp;</Label>
      <Spacing w={8} />
      <FeePill onPress={() => setIsFiatValueVisible(!isFiatValueVisible)} hasError={hasError}>
        <BaseText small color="#ffffff">{labelValue}</BaseText>
      </FeePill>
      <Spacing w={8} />
    </LabelWrapper>
  );
};

const mapStateToProps = ({
  appSettings: { data: { baseFiatCurrency } },
  rates: { data: rates },
}: RootReducerState): $Shape<Props> => ({
  baseFiatCurrency,
  rates,
});

const structuredSelector = createStructuredSelector({
  accountAssets: accountAssetsSelector,
  accountHistory: accountHistorySelector,
});

const combinedMapStateToProps = (state: RootReducerState): $Shape<Props> => ({
  ...structuredSelector(state),
  ...mapStateToProps(state),
});

export default connect(combinedMapStateToProps)(FeeLabelToggle);
