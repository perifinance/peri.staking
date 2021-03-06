import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";

import { ThemeProvider } from "styled-components";
import { NotificationContainer, NotificationManager } from "react-notifications";

import { RootState } from "config/reducers";
import { updateThemeStyles } from "config/reducers/theme";
import { updateRatio } from "config/reducers/rates";
import { updateExchangeRates } from "config/reducers/rates";
import { updateVestable } from "config/reducers/vest";
import { updateAddress, updateNetwork, updateIsConnect } from "config/reducers/wallet";
import { updateNetworkFee } from "config/reducers/networkFee";
import { resetTransaction } from "config/reducers/transaction";
import { setLoading } from "config/reducers/loading";
import { getNetworkFee } from "lib/fee";
import { SUPPORTED_NETWORKS } from "lib/network";

import { clearWallet, clearBalances } from "config/reducers/wallet";
import { clearCRatio } from "config/reducers/rates";
import { toggleLiquid, updateTimestamp } from "config/reducers/liquidation";
import { initCurrency } from "config/reducers/wallet";
import { InitOnboard, onboard } from "lib/onboard/onboard";
import { contracts } from "lib/contract";
import { getVestable } from "lib/vest";
import { getBalances } from "lib/balance";
import { getRatios } from "lib/rates";
import { getTimeStamp } from "lib/liquidation";
import Loading from "./screens/Loading";
import Main from "./screens/Main";
import "./App.css";

// import {getDebts} from 'lib/balance/getDebts'

const App = () => {
	const { address, networkId } = useSelector((state: RootState) => state.wallet);

	const { balances } = useSelector((state: RootState) => state.balances);
	const transaction = useSelector((state: RootState) => state.transaction);

	const themeStyles = useSelector((state: RootState) => state.themeStyles.styles);
	const themeState = useSelector((state: RootState) => state.theme.theme);

	const dispatch = useDispatch();
	const intervalTime = 1000 * 60 * 3;
	const [intervals, setIntervals] = useState(null);
	const [onboardInit, setOnboardInit] = useState(false);

	const { Liquidations } = contracts as any;

	//     const [userAddress, setUserAddress] = useState('test');

	const getSystemData = useCallback(
		async (isLoading) => {
			dispatch(setLoading({ name: "balance", value: isLoading }));

			const [ratios, gasPrice] = await Promise.all([getRatios(address), getNetworkFee(networkId)]);

			dispatch(updateRatio(ratios.ratio));
			dispatch(updateExchangeRates(ratios.exchangeRates));

			dispatch(updateNetworkFee({ gasPrice }));

			if (address) {
				const [balancesData, vestable, stateLiquid, timestamp] = await Promise.all([
					getBalances(
						address,
						balances,
						ratios.exchangeRates,
						ratios.ratio.targetCRatio,
						ratios.ratio.currentCRatio
					),
					getVestable(address),
					await Liquidations.isOpenForLiquidation(address),
					await getTimeStamp(address, Liquidations),
				]);

				dispatch(updateTimestamp(timestamp));
				dispatch(initCurrency(balancesData));
				dispatch(toggleLiquid(stateLiquid));
				//todo:: code move call
				dispatch(updateVestable({ vestable }));
			}

			dispatch(setLoading({ name: "balance", value: false }));
		},
		[address, networkId]
	);

	const setOnboard = async () => {
		let networkId = Number(process.env.REACT_APP_DEFAULT_NETWORK_ID);
		contracts.init(networkId);
		dispatch(updateNetwork({ networkId: networkId }));
		try {
			InitOnboard(
				networkId,
				{
					wallet: async (wallet) => {
						if (wallet.provider) {
							contracts.wallet = wallet;
							localStorage.setItem("selectedWallet", wallet.name);
						}
					},
					address: async (newAddress) => {
						if (newAddress) {
							if (SUPPORTED_NETWORKS[onboard.getState().network]) {
								contracts.connect(newAddress);
								dispatch(clearBalances());
								dispatch(clearCRatio());
								dispatch(updateAddress({ address: newAddress }));
								dispatch(updateIsConnect(true));
							} else {
								onboard.walletReset();
							}
						}
					},
					network: async (network) => {
						if (network) {
							if (SUPPORTED_NETWORKS[network]) {
								contracts.init(network);
								onboard.config({ networkId: network });
								dispatch(updateNetwork({ networkId: network }));
								contracts.connect(address);
							} else {
								NotificationManager.warning(
									`This network is not supported. Please change to bsc or polygon or ethereum network`,
									"ERROR"
								);
								onboard.walletReset();
								onboard.config({ networkId: network });
								dispatch(updateNetwork({ networkId: network }));
								dispatch(updateIsConnect(false));
								localStorage.removeItem("selectedWallet");
								dispatch(clearWallet());
								dispatch(clearCRatio());
								dispatch(clearBalances());
								dispatch(updateVestable({ vestable: false }));
								clearInterval(intervals);
							}
						}
					},
				},
				themeState === "dark"
			);
		} catch (e) {
			console.log(e);
			localStorage.clear();
			// window.location.reload()
		}
		const selectedWallet = localStorage.getItem("selectedWallet");

		if (selectedWallet) {
			try {
				await onboard.walletSelect(selectedWallet);
				await onboard.walletCheck();
			} catch (e) {
				console.log(e);
			}
		}
		setOnboardInit(true);
	};

	useEffect(() => {
		if (transaction.hash) {
			const getState = async () => {
				await contracts.provider.once(transaction.hash, async (transactionState) => {
					if (transactionState.status !== 1) {
						NotificationManager.remove(NotificationManager.listNotify[0]);
						NotificationManager.warning(`${transaction.type} error`, "ERROR");
					} else {
						await getSystemData(true);
						NotificationManager.remove(NotificationManager.listNotify[0]);
						NotificationManager.success(`${transaction.type} success`, "SUCCESS");
						dispatch(resetTransaction());
					}
				});
			};
			getState();

			NotificationManager.info(transaction.message, "In progress", 0);
		}
		// eslint-disable-next-line
	}, [transaction]);

	useEffect(() => {
		if (!onboardInit) {
			setOnboard();
		}
		dispatch(updateThemeStyles(themeState));

		// eslint-disable-next-line
	}, []);

	useEffect(() => {
		if (onboardInit && networkId !== 0) {
			getSystemData(true);
			if (intervals) {
				clearInterval(intervals);
			}
			setIntervals(setInterval(() => getSystemData(false), intervalTime));
		}
		// eslint-disable-next-line
	}, [networkId, address, onboardInit]);

	// <input type="text" value={userAddress} onChange={(e) => {setUserAddress(e.target.value)}} />
	// <button onClick={() => getDebts(userAddress)}>getDebts</button>
	return (
		<>
			<Loading></Loading>
			<ThemeProvider theme={themeStyles}>
				<Main></Main>
			</ThemeProvider>
			<NotificationContainer />
		</>
	);
};

export default App;
