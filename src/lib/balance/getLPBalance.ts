import { contracts } from "lib/contract";

import { getBalance } from "./getBalance";

export const getLPBalance = async (currentWallet:string, currencies:any) => {

	if (!contracts["LP"]?.networkId) return null;
	
	const [LPBalance, LPRewardEscrow, stakedLP, LPAllowance] = 
		await Promise.all([
			getBalance(currentWallet, "LP", currencies["LP"].decimal),
			contracts["LP"].earned(currentWallet),
			contracts["LP"].stakedAmountOf(currentWallet),
			contracts["LP"].allowance(currentWallet),
		]).then((values) => values.map((value) => BigInt(value)));

	// console.log("LPBalance", LPBalance, "LPRewardEscrow", LPRewardEscrow, "stakedLP", stakedLP, "LPAllowance", LPAllowance);
	// const LPAllowance = LPBalance > 0n ? BigInt((await contracts["LP"].allowance(currentWallet)).toString()) : 0n;

	return { ...currencies["LP"],
		balance: LPBalance + stakedLP,
		transferable: LPBalance,
		allowance: LPAllowance,
		staked: stakedLP,
		stakeable: LPBalance,
		rewardEscrow: LPRewardEscrow,
	}

};