import { createSlice , PayloadAction } from '@reduxjs/toolkit';
import { SUPPORTED_NETWORKS, SUPPORTED_NETWORKS_CONFIRM } from 'lib/network'

export type WalletState = {
	address?: string,
	networkName?: string,
	networkId?: number,
	isConnect?: boolean,
	confirm?: number,
	
}


const initialState: WalletState = {
	address: null,
	networkName: null,
	networkId: Number(process.env.REACT_APP_DEFAULT_NETWORK_ID),
	isConnect: false,
	confirm: 12,
};

export const wallet = createSlice({
	name: 'wallet',
	initialState,
	reducers: {
		updateAddress(state, actions: PayloadAction<WalletState>) {
			state.address = actions.payload.address;
		},
		updateNetwork(state, actions: PayloadAction<WalletState>) {
			state.networkId = actions.payload.networkId;
			state.networkName = SUPPORTED_NETWORKS[actions.payload.networkId];
			if(state.networkName === 'MAINNET' ) {
				state.networkName  = 'ETHEREUM'
			}
			state.confirm = SUPPORTED_NETWORKS_CONFIRM[actions.payload.networkId];
		},

		updateIsConnect(state, actions: PayloadAction<boolean>) {
			state.isConnect = actions.payload;
		},

		clearWallet(state) {
			state.address = null;
			state.isConnect = false;
		},
	},
});

export const { updateAddress, updateNetwork, updateIsConnect, clearWallet } = wallet.actions;

export default wallet.reducer;
