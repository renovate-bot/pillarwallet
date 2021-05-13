// @flow
/*
    Pillar Wallet: the personal data locker
    Copyright (C) 2021 Stiftung Pillar Project

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

import type { Chain } from 'models/Chain';
import type { WalletConnectCmsApp } from 'models/WalletConnectCms';

/**
 * Returns apps matching given chain.
 * If chain is nil it returns all passed apps.
 */
export function filterAppsByChain(apps: WalletConnectCmsApp[], chain: ?Chain): WalletConnectCmsApp[] {
  if (!chain) return apps;
  return apps.filter(app => app.chains.includes(chain));
}

// NOTE: replace by proper useWalletConnect hook when available
// Mock data
export function useWalletConnect() {
  return {
    activeConnectors: [0, 1, 2, 3],
  };
}
