import { createSlice, PayloadAction } from '@reduxjs/toolkit';
export type RatiosState = {
    currentCRatio: bigint
	targetCRatio: bigint
    liquidationRatio: bigint
}

const initialState: RatiosState = {
	currentCRatio: 0n,
	targetCRatio: 250000000000000000n,
    liquidationRatio: 666666666666666666n,
}

export const RatioSlice = createSlice({
	name: 'ratio',
	initialState,
	reducers: {
		updateRatio(state,  actions: PayloadAction<RatiosState>) {
			state.currentCRatio = actions.payload.currentCRatio;
			state.targetCRatio = actions.payload.targetCRatio;
			state.liquidationRatio = actions.payload.liquidationRatio;
		},
		clearCRatio(state) {
			state.currentCRatio = 0n;
		}
	},
});

export const { updateRatio, clearCRatio } = RatioSlice.actions;

export default RatioSlice.reducer;