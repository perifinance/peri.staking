import { contracts } from "lib/contract";
import { utils } from "ethers";
import { getBalance } from "./getBalance";
import { formatDecimal } from "lib";
export const getBalances = async (
	currentWallet,
	currencies,
	exchangeRates,
	targetCRatio,
	currentCRatio
) => {
	const stakeAble: boolean =
		currentCRatio === 0n ||
		currentCRatio <= 25n * BigInt(Math.pow(10, 16).toString()); //0.25;

	const { PeriFinance, ExternalTokenStakeManager, RewardEscrowV2 } =
		contracts as any;

	const USDCDecimal =
		contracts.networkId === 56 ? 18 : currencies["USDC"].decimal;
	const DAIDecimal = currencies["DAI"].decimal;

	const [
		debtBalance,
		pUSDBalance,
		USDCBalance,
		DAIBalance,
		periBalance,
		transferablePERI,
		PERIRewardEscrow,
	] = await Promise.all([
		(async () =>
			BigInt(
				await PeriFinance.debtBalanceOf(
					currentWallet,
					utils.formatBytes32String("pUSD")
				)
			))(),
		await getBalance(currentWallet, "PynthpUSD", currencies["pUSD"].decimal),
		await getBalance(currentWallet, "USDC", USDCDecimal),
		await getBalance(currentWallet, "DAI", DAIDecimal),
		(async () => BigInt(await PeriFinance.collateral(currentWallet)))(),
		(async () =>
			BigInt(await PeriFinance.transferablePeriFinance(currentWallet)))(),
		(async () => BigInt(await RewardEscrowV2.balanceOf(currentWallet)))(),
	]);

	let USDCAllowance,
		DAIAllowance,
		LPAllowance = 0n;

	if (debtBalance > 0n) {
		USDCAllowance = formatDecimal(
			BigInt(
				(
					await contracts["USDC"].allowance(
						currentWallet,
						contracts?.addressList["ExternalTokenStakeManager"].address
					)
				).toString()
			),
			USDCDecimal
		);
	}

	if (debtBalance > 0n) {
		DAIAllowance = formatDecimal(
			BigInt(
				(
					await contracts["DAI"].allowance(
						currentWallet,
						contracts?.addressList["ExternalTokenStakeManager"].address
					)
				).toString()
			),
			DAIDecimal
		);
	}

	let [LPBalance, LPRewardEscrow, stakedLP] = contracts["LP"]
		? await Promise.all([
				await getBalance(currentWallet, "LP", currencies["LP"].decimal),
				(async () => BigInt(await contracts["LP"].earned(currentWallet)))(),
				(async () =>
					BigInt(await contracts["LP"].stakedAmountOf(currentWallet)))(),
		  ])
		: [0n, 0n, 0n];

	if (LPBalance > 0n) {
		LPAllowance = contracts["LP"]
			? BigInt((await contracts["LP"].allowance(currentWallet)).toString())
			: 0n;
	}

	let [stakedUSDC, stakedDAI] =
		debtBalance > 0n
			? await Promise.all([
					(async () =>
						BigInt(
							await ExternalTokenStakeManager.stakedAmountOf(
								currentWallet,
								utils.formatBytes32String("USDC"),
								utils.formatBytes32String("USDC")
							)
						))(),
					(async () =>
						BigInt(
							await ExternalTokenStakeManager.stakedAmountOf(
								currentWallet,
								utils.formatBytes32String("DAI"),
								utils.formatBytes32String("DAI")
							)
						))(),
			  ])
			: [0n, 0n, 0n, 0n, 0n];

	let usdcDebt,
		daiDebt,
		stableDEBT,
		periDebt,
		mintableStable,
		USDCStakeable,
		DAIStakeable,
		PERIStaked,
		PERIStakeable: bigint = 0n;

	try {
		usdcDebt =
			(BigInt(stakedUSDC) * exchangeRates["USDC"]) /
			BigInt(Math.pow(10, 18).toString()) /
			(BigInt(Math.pow(10, 18).toString()) / targetCRatio);
		daiDebt =
			(BigInt(stakedDAI) * exchangeRates["DAI"]) /
			BigInt(Math.pow(10, 18).toString()) /
			(BigInt(Math.pow(10, 18).toString()) / targetCRatio);
		stableDEBT = usdcDebt + daiDebt;
		periDebt = debtBalance - stableDEBT;

		mintableStable = periDebt / 4n - stableDEBT;
		mintableStable = mintableStable <= 0n ? 0n : mintableStable;
		USDCStakeable = stakeAble
			? (mintableStable *
					(BigInt(Math.pow(10, 18).toString()) / targetCRatio) *
					BigInt(Math.pow(10, 18).toString())) /
			  exchangeRates["USDC"]
			: 0n;
		DAIStakeable = stakeAble
			? (mintableStable *
					(BigInt(Math.pow(10, 18).toString()) / targetCRatio) *
					BigInt(Math.pow(10, 18).toString())) /
			  exchangeRates["DAI"]
			: 0n;

		if (USDCStakeable > USDCBalance) {
			USDCStakeable = USDCBalance;
		}

		if (DAIStakeable > DAIBalance) {
			DAIStakeable = DAIBalance;
		}

		PERIStaked =
			(periDebt *
				(BigInt(Math.pow(10, 18).toString()) / targetCRatio) *
				BigInt(Math.pow(10, 18).toString())) /
			exchangeRates["PERI"];
		PERIStaked = periBalance < PERIStaked ? periBalance : PERIStaked;
		PERIStakeable = BigInt(periBalance) - PERIStaked;
		PERIStakeable = PERIStakeable <= 0n ? 0n : PERIStakeable;
	} catch (e) {
		console.log(e);
	}

	return {
		DEBT: {
			...currencies["DEBT"],
			balance: debtBalance,
			transferable: 0n,
			USDC: usdcDebt,
			DAI: daiDebt,
			PERI: periDebt,
			stable: stableDEBT,
		},
		PERI: {
			...currencies["PERI"],
			balance: periBalance,
			staked: PERIStaked,
			stakeable: PERIStakeable,
			transferable: transferablePERI,
			rewardEscrow: PERIRewardEscrow,
		},
		pUSD: {
			...currencies["pUSD"],
			balance: pUSDBalance,
			transferable: pUSDBalance,
		},
		USDC: {
			...currencies["USDC"],
			balance: USDCBalance + stakedUSDC,
			transferable: USDCBalance,
			staked: stakedUSDC,
			stakeable: USDCStakeable,
			mintable: stakeAble ? mintableStable : 0n,
			allowance: USDCAllowance,
		},
		DAI: {
			...currencies["DAI"],
			balance: DAIBalance + stakedDAI,
			transferable: DAIBalance,
			staked: stakedDAI,
			mintable: stakeAble ? mintableStable : 0n,
			stakeable: DAIStakeable,
			allowance: DAIAllowance,
		},
		LP: {
			...currencies["LP"],
			balance: LPBalance + stakedLP,
			transferable: LPBalance,
			allowance: LPAllowance,
			staked: stakedLP,
			stakeable: LPBalance,
			rewardEscrow: LPRewardEscrow,
		},
	};
};
