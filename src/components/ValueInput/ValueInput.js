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

import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Keyboard } from 'react-native';
import { createStructuredSelector } from 'reselect';
import styled, { withTheme } from 'styled-components/native';
import t from 'translations/translate';

// components
import TextInput from 'components/TextInput';
import PercentsInputAccessoryHolder, {
  INPUT_ACCESSORY_NATIVE_ID,
} from 'components/PercentsInputAccessory/PercentsInputAccessoryHolder';
import AssetSelectorModal from 'components/AssetSelectorModal';
import CollectibleImage from 'components/CollectibleImage';
import { MediumText } from 'components/Typography';
import Icon from 'components/Icon';
import Input from 'components/Input';
import { Spacing } from 'components/Layout';
import Modal from 'components/Modal';

// utils
import {
  formatAmount,
  isValidNumber,
  wrapBigNumber,
  hasTooMuchDecimals,
  noop,
  formatFiat,
} from 'utils/common';
import { getThemeColors } from 'utils/themes';
import { images } from 'utils/images';
import { calculateMaxAmount, getFormattedBalanceInFiat, getRate, getBalanceInFiat } from 'utils/assets';

// constants
import { COLLECTIBLES, TOKENS, BTC, defaultFiatCurrency } from 'constants/assetsConstants';
import { CHAIN } from 'constants/chainConstants';

// selectors
import { accountAssetsBalancesSelector } from 'selectors/balances';
import { accountAssetsWithBalanceSelector } from 'selectors/assets';
import { activeAccountMappedCollectiblesSelector } from 'selectors/collectibles';
import { useChainRates } from 'selectors';

// types
import type { RootReducerState } from 'reducers/rootReducer';
import type { AssetOption } from 'models/Asset';
import type { Collectible } from 'models/Collectible';
import type { Theme } from 'models/Theme';
import type { TransactionFeeInfo } from 'models/Transaction';
import type { CategoryBalancesPerChain, WalletAssetsBalances } from 'models/Balances';
import type { Currency, RatesBySymbol } from 'models/Rates';

// local
import ValueInputHeader from './ValueInputHeader';

export type ExternalProps = {|
  disabled?: boolean,
  customAssets?: AssetOption[],
  customBalances?: WalletAssetsBalances,
  selectorOptionsTitle?: string,
  assetData: AssetOption | Collectible,
  // Called when selected asset is AssetOption
  onAssetDataChange: (AssetOption) => mixed,
  // Called when selected asset is Collectible
  onCollectibleAssetDataChange?: (Collectible) => mixed,
  value: string,
  onValueChange: (string, number | void) => void, // `newPercent` provided as the second argument (if used by user)
  showCollectibles?: boolean,
  txFeeInfo?: ?TransactionFeeInfo,
  hideMaxSend?: boolean,
  updateTxFee?: (string, number) => Object,
  leftSideSymbol?: string,
  getInputRef?: (Input) => void,
  onFormValid?: (boolean) => void,
  disableAssetChange?: boolean,
  customRates?: RatesBySymbol,
|};

type InnerProps = {|
  assets: AssetOption[],
  accountAssetsBalances: CategoryBalancesPerChain,
  baseFiatCurrency: ?Currency,
  collectibles: Collectible[],
  theme: Theme,
|};

type Props = {| ...InnerProps, ...ExternalProps |};

const CollectibleWrapper = styled.View`
  align-items: center;
`;

const SelectorChevron = styled(Icon)`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.basic030};
`;

const getErrorMessage = (
  amount: string,
  assetBalance: string,
  assetSymbol: string,
  fiatValue?: ?string,
): string => {
  const amountBN = wrapBigNumber(amount);
  const assetBalanceBN = wrapBigNumber(assetBalance);

  const isValid = isValidNumber(amount);
  if (!isValid || (!!fiatValue && !isValidNumber(fiatValue))) {
    return t('error.amount.invalidNumber');
  } else if (assetSymbol !== BTC && assetBalanceBN.lt(amountBN)) {
    return t('error.amount.notEnoughToken', { token: assetSymbol });
  }
  return '';
};

const ValueInputComponent = ({
  disabled,
  assets,
  customAssets,
  accountAssetsBalances,
  customBalances,
  baseFiatCurrency,
  selectorOptionsTitle = t('transactions.title.valueSelectorModal'),
  assetData,
  onAssetDataChange,
  onCollectibleAssetDataChange,
  value,
  onValueChange,
  showCollectibles,
  txFeeInfo,
  hideMaxSend,
  updateTxFee,
  collectibles,
  theme,
  leftSideSymbol,
  getInputRef,
  onFormValid,
  disableAssetChange,
  customRates,
}: Props) => {
  const [valueInFiat, setValueInFiat] = useState<string>('');
  const [displayFiatAmount, setDisplayFiatAmount] = useState<boolean>(false);
  const [calculateBalanceSendPercent, setCalculateBalanceSendPercent] = useState<?number>(null);

  const assetSymbol = assetData.symbol || '';
  const chain = assetData?.chain || CHAIN.ETHEREUM;
  const walletBalances = accountAssetsBalances?.[chain]?.wallet ?? {};
  const assetBalance = (customBalances || walletBalances)[assetSymbol]?.balance || '0';
  const balanceAvailable = calculateMaxAmount(assetSymbol, assetBalance);

  const chainRates = useChainRates(chain);
  const ratesWithCustomRates = { ...chainRates, ...(customRates ?? {}) };

  const fiatCurrency = baseFiatCurrency || defaultFiatCurrency;

  const formattedBalanceAvailableInFiat = getFormattedBalanceInFiat(
    fiatCurrency,
    balanceAvailable,
    ratesWithCustomRates,
    assetSymbol,
  );
  const formattedValueInFiat = getFormattedBalanceInFiat(fiatCurrency, value, ratesWithCustomRates, assetSymbol);
  const leftPositionValue = formattedValueInFiat === '' ? formatFiat('0', fiatCurrency) : formattedValueInFiat;

  React.useEffect(() => {
    if (disabled) { // handle fiat updates when disabled, e.g. on Exchange screen
      const fiatValue = getBalanceInFiat(fiatCurrency, value, ratesWithCustomRates, assetSymbol);
      setValueInFiat(String(fiatValue ? fiatValue.toFixed(2) : 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  React.useEffect(() => {
    if (!calculateBalanceSendPercent) return;

    const maxValueNetFee = wrapBigNumber(calculateMaxAmount(
      assetSymbol,
      assetBalance,
      txFeeInfo?.fee,
      txFeeInfo?.gasToken,
    ));

    const newValue = formatAmount(maxValueNetFee.multipliedBy(calculateBalanceSendPercent).dividedBy(100));
    onValueChange(newValue);

    const newValueInFiat = getBalanceInFiat(fiatCurrency, newValue.toString(), ratesWithCustomRates, assetSymbol);
    setValueInFiat(newValueInFiat ? newValueInFiat.toFixed(2) : '0');

    setCalculateBalanceSendPercent(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txFeeInfo, calculateBalanceSendPercent]);

  const handleValueChange = (newValue: string) => {
    // ethers will crash with commas, TODO: we need a proper localisation
    newValue = newValue.replace(/,/g, '.');
    if (displayFiatAmount) {
      if (hasTooMuchDecimals(newValue, 2)) return;

      const tokenValue = getAssetBalanceFromFiat(baseFiatCurrency, newValue, ratesWithCustomRates, assetSymbol);
      const truncatedTokenValue = formatAmount(tokenValue, assetData.decimals);
      onValueChange(truncatedTokenValue);
      setValueInFiat(newValue);
    } else {
      if (hasTooMuchDecimals(newValue, assetData.decimals)) return;

      onValueChange(newValue);
      const fiatValue = getBalanceInFiat(fiatCurrency, newValue, ratesWithCustomRates, assetSymbol);
      setValueInFiat(String(fiatValue ? fiatValue.toFixed(2) : 0));
    }
  };

  const handleUsePercent = async (percent: number) => {
    Keyboard.dismiss();
    setCalculateBalanceSendPercent(percent);
    if (updateTxFee) updateTxFee(assetSymbol, percent / 100);
    let newTxFeeInfo = txFeeInfo;
    if (updateTxFee) {
      newTxFeeInfo = await updateTxFee(assetSymbol, percent / 100);
    }

    const maxValueNetFee = wrapBigNumber(calculateMaxAmount(
      assetSymbol,
      assetBalance,
      newTxFeeInfo?.fee,
      newTxFeeInfo?.gasToken,
    ));

    const newValue = formatAmount(maxValueNetFee.multipliedBy(percent).dividedBy(100), assetData.decimals);
    onValueChange(newValue, percent);

    const newValueInFiat = getBalanceInFiat(fiatCurrency, newValue.toString(), ratesWithCustomRates, assetSymbol);
    setValueInFiat(newValueInFiat ? newValueInFiat.toFixed(2) : '0');
  };

  const onInputBlur = () => {
    PercentsInputAccessoryHolder.removeAccessory();
  };

  const onInputFocus = () => {
    PercentsInputAccessoryHolder.addAccessory(handleUsePercent);
  };

  const assetsOptions = customAssets || assets;

  const openAssetSelector = () => {
    Keyboard.dismiss();
    Modal.open(() => (
      <AssetSelectorModal
        options={assetsOptions}
        collectibles={showCollectibles ? collectibles : undefined}
        onSelectOption={onAssetDataChange}
        onSelectCollectible={onCollectibleAssetDataChange}
        title={selectorOptionsTitle}
      />
    ));
  };

  const getCustomLabel = () => {
    const labelText = !hideMaxSend
      ? `${formatAmount(balanceAvailable, 2)} ${assetSymbol} (${formattedBalanceAvailableInFiat})`
      : null;
    return (
      <ValueInputHeader
        asset={assetData}
        onAssetPress={openAssetSelector}
        labelText={labelText}
        onLabelPress={() => !disabled ? handleUsePercent(100) : undefined}
        disableAssetSelection={disableAssetChange || assetsOptions.length <= 1}
      />
    );
  };

  const inputProps = {
    value: displayFiatAmount ? valueInFiat : value,
    maxLength: 42,
    customLabel: getCustomLabel(),
    onChange: handleValueChange,
    placeholder: '0',
    keyboardType: 'decimal-pad',
    editable: !disabled,
    inputAccessoryViewID: INPUT_ACCESSORY_NATIVE_ID,
    onBlur: onInputBlur,
    onFocus: onInputFocus,
    selection: disabled ? { start: 0, end: 0 } : null,
  };

  const errorMessage = disabled ? null : getErrorMessage(
    value, balanceAvailable, assetSymbol, displayFiatAmount ? valueInFiat : null,
  );

  React.useEffect(() => {
    if (onFormValid) {
      onFormValid(!errorMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMessage]);

  React.useEffect(() => {
    if (value) {
      onValueChange?.('0');
      setValueInFiat('0');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetData.name]);

  const colors = getThemeColors(theme);
  const { towellie: genericCollectible } = images(theme);

  const { tokenType = TOKENS } = assetData;

  const toggleDisplayFiat = () => {
    // when switching at error state, reset values to avoid new errors
    if (errorMessage) {
      setValueInFiat('0');
      handleValueChange('0');
    }
    setDisplayFiatAmount(!displayFiatAmount);
  };

  return (
    <>
      {tokenType === TOKENS && (
        <TextInput
          style={{ width: '100%' }}
          hasError={!!errorMessage}
          errorMessage={errorMessage}
          inputProps={inputProps}
          numeric
          itemHolderStyle={{ borderRadius: 10 }}
          onRightAddonPress={disableAssetChange ? noop : openAssetSelector}
          leftSideText={displayFiatAmount
            ? t('tokenValue', { value: formatAmount(value || '0', 2), token: assetSymbol || '' })
            : leftPositionValue
          }
          onLeftSideTextPress={toggleDisplayFiat}
          rightPlaceholder={displayFiatAmount ? fiatCurrency : assetSymbol}
          leftSideSymbol={leftSideSymbol}
          getInputRef={getInputRef}
          inputWrapperStyle={{ zIndex: 10 }}
        />
      )}
      {tokenType === COLLECTIBLES && (
        <CollectibleWrapper>
          <MediumText medium onPress={disableAssetChange ? noop : openAssetSelector}>
            {assetData.name}
            <SelectorChevron name="selector" color={colors.labelTertiary} />
          </MediumText>
          <Spacing h={16} />
          <CollectibleImage
            source={{ uri: assetData.imageUrl }}
            fallbackSource={genericCollectible}
            resizeMode="contain"
            width={180}
            height={180}
          />
        </CollectibleWrapper>
      )}
    </>
  );
};

const mapStateToProps = ({
  appSettings: { data: { baseFiatCurrency } },
}: RootReducerState): $Shape<Props> => ({
  baseFiatCurrency,
});

const structuredSelector = createStructuredSelector({
  accountAssetsBalances: accountAssetsBalancesSelector,
  assets: accountAssetsWithBalanceSelector,
  collectibles: activeAccountMappedCollectiblesSelector,
});

const combinedMapStateToProps = (state: RootReducerState): $Shape<Props> => ({
  ...structuredSelector(state),
  ...mapStateToProps(state),
});

export default withTheme(connect(combinedMapStateToProps)(ValueInputComponent));

const getAssetBalanceFromFiat = (
  baseFiatCurrency: ?Currency,
  fiatBalance: ?string | ?number,
  rates: RatesBySymbol,
  symbol: string,
): number => {
  const fiatCurrency = baseFiatCurrency || defaultFiatCurrency;
  const assetBalanceFromFiat = fiatBalance ? parseFloat(fiatBalance) / getRate(rates, symbol, fiatCurrency) : 0;
  return assetBalanceFromFiat || 0;
};
