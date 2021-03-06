import { utils } from "ethers";
import { setLoading } from "config/reducers/loading";
import { updateTransaction } from "config/reducers/transaction";

export const getTake = async (
	id: number,
	address: string,
	list: any,
	dispatch: any,
	contracts: any
) => {
	if (address !== list[id].address) {
		dispatch(setLoading({ name: "liquidation", value: true }));

		const collateral = {
			Peri: BigInt(
				(
					await contracts.ExchangeRates.rateForCurrency(utils.formatBytes32String("PERI"))
				).toString()
			),
			USDC: BigInt(
				(
					await contracts.ExchangeRates.rateForCurrency(utils.formatBytes32String("USDC"))
				).toString()
			),
			Dai: BigInt(
				(await contracts.ExchangeRates.rateForCurrency(utils.formatBytes32String("DAI"))).toString()
			),
		};

		const peri = (BigInt(list[id].collateral[0].value) * BigInt(collateral.Peri)) / 10n ** 18n;
		const dai = (BigInt(list[id].collateral[1].value) * BigInt(collateral.Dai)) / 10n ** 18n;
		const usdc = (BigInt(list[id].collateral[2].value) * BigInt(collateral.USDC)) / 10n ** 18n;

		const sumCollateral = peri + dai + usdc;

		getState(peri, id, contracts, list, dispatch);
	}
};

const getState = async (pUSD: any, id: number, contracts: any, list: any, dispatch: any) => {
	try {
		const transaction = await contracts.signers.PeriFinance.liquidateDelinquentAccount(
			list[id].address,
			// BigInt(sumCollateral)
			BigInt(pUSD)
		);

		await contracts.provider.once(transaction.hash, async (state) => {
			if (state.status === 1) {
				dispatch(
					updateTransaction({
						hash: transaction.hash,
						message: `Get take`,
						type: "Get take",
					})
				);
				dispatch(setLoading({ name: "liquidation", value: false }));
			}
		});
	} catch (e) {
		console.log("take err", e);
		dispatch(setLoading({ name: "liquidation", value: false }));
	}
};
