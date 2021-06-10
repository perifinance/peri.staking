import { createSlice , PayloadAction, createAsyncThunk} from '@reduxjs/toolkit';
import { connectHelper } from 'helpers/wallet/connect'

export type WalletState = {
	currentWallet?: string,
	networkId?: number,
	networkName?: string, 
	unlocked?: boolean,
	walletType?: string,
	unlockReason?: string,
}

const connectWallet = createAsyncThunk(
	`connectWallet`,
	async (walletType) => {
        return await connectHelper(walletType);
    }
);


const clearWalletState = () => { 
	return {
		currentWallet: undefined,
		networkId: 1,
		networkName: undefined,
		unlocked: false,
		walletType: undefined,
		unlockReason: undefined,
	}
}

const initialState: WalletState = clearWalletState();

export const wallet = createSlice({
	name: 'wallet',
	initialState,
	reducers: {
		initWallet(state) {
			state.unlockReason = undefined;
			state.unlocked = false;
		},
		updateWallet(state, actions: PayloadAction<WalletState>)  {
			state = Object.assign(state, {...actions.payload});
		},
		clearWallet(state) {
			state = Object.assign(state, clearWalletState());
		},
	},
	extraReducers: {
		[connectWallet.fulfilled.type]: (state, actions: PayloadAction<WalletState>) => {
			state = Object.assign(state, {...actions.payload});
		}
	}
});

export const { initWallet, updateWallet, clearWallet } = wallet.actions;

export default wallet.reducer;
