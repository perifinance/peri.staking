import { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";

import { ThemeProvider } from "styled-components";
import { NotificationContainer, NotificationManager } from "react-notifications";

import { RootState } from "config/reducers";
import { updateThemeStyles } from "config/reducers/theme";
import { updateRatio } from "config/reducers/rates";
import { updateExchangeRates } from "config/reducers/rates";
import { updateVestable } from "config/reducers/vest";
import {
  updateAddress,
  updateNetwork,
  updateIsConnect,
  clearWallet,
  clearBalances,
  setIsReady,
  setIsLoading,
} from "config/reducers/wallet";
import { updateNetworkFee } from "config/reducers/networkFee";
import { resetTransaction } from "config/reducers/transaction";
import { getNetworkFee } from "lib/fee";
import { SUPPORTED_NETWORKS } from "lib/network";
import { clearCRatio } from "config/reducers/rates";
import { toggleLiquid, updateTimestamp } from "config/reducers/liquidation";
import { setBalances } from "config/reducers/wallet";
import { web3Onboard } from "lib/onboard";
import { contracts } from "lib/contract";
import { getVestable } from "lib/vest";
import { getBalances } from "lib/balance";
import { getRatios } from "lib/rates";
import Loading from "./screens/Loading";
import Main from "./screens/Main";
import "./App.css";
import { end, start } from "lib/etc/performance";
import { natives } from "lib/rpcUrl/rpcUrl";

const App = () => {
  const { address, networkId } = useSelector((state: RootState) => state.wallet);
  const { balances, isReady } = useSelector((state: RootState) => state.balances);
  const transaction = useSelector((state: RootState) => state.transaction);
  const themeStyles = useSelector((state: RootState) => state.themeStyles.styles);
  const themeState = useSelector((state: RootState) => state.theme.theme);

  const dispatch = useDispatch();
  const intervalTime = 1000 * 60 * 1;
  const [intervals, setIntervals] = useState(null);
  const [timer, setTimer] = useState(0);
  const [onboardInit, setOnboardInit] = useState(false);

  const getSystemData = useCallback(
    async (/* refresh */) => {
      start("getSystemData");
      console.log("networkId", networkId);
      try {
        if (address) {
          dispatch(setIsLoading(true));
          const [ratios, gasPrice] = await Promise.all([
            getRatios(address, natives[networkId]),
            getNetworkFee(networkId),
          ]);

          const { Liquidations } = contracts as any;
          // console.log("ratios", ratios);
          if (contracts.networkId === networkId) {
            const [balancesData, vestable, stateLiquid] = await Promise.all([
              getBalances(address, balances, ratios.exchangeRates, ratios.ratio.currentCRatio),
              getVestable(address),
              Liquidations.getLiquidationInfo(address),
            ]);

            dispatch(setIsReady(false));
            dispatch(updateRatio(ratios.ratio));
            dispatch(updateExchangeRates(ratios.exchangeRates));
            dispatch(updateNetworkFee({ gasPrice }));

            //todo:: code move call
            dispatch(updateVestable({ vestable }));
            dispatch(updateTimestamp(stateLiquid.deadline));
            dispatch(toggleLiquid(stateLiquid.isOpen));
            dispatch(setBalances(balancesData));
            dispatch(setIsReady(true));
          }
        }
      } catch (err) {
        console.log(err);
        localStorage.removeItem("selectedWallet");
        NotificationManager.warning("Data fetching error", "Data Stream");
      }
      dispatch(setIsLoading(false));
      end();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, networkId]
  );

  const setOnboard = async () => {
    // console.log("setOnboard");
    let networkId = Number(process.env.REACT_APP_DEFAULT_NETWORK_ID);

    contracts.init(networkId);
    dispatch(updateNetwork({ networkId: networkId }));
    try {
      web3Onboard.init(
        {
          wallet: async (wallet) => {
            if (wallet?.provider !== undefined) {
              contracts.wallet = wallet;
              localStorage.setItem("selectedWallet", wallet.label);
              // console.log("wallet connected", wallet);
              return;
            }

            localStorage.removeItem("selectedWallet");
            dispatch(clearWallet());
            dispatch(clearCRatio());
            dispatch(clearBalances());
            dispatch(updateVestable({ vestable: false }));
            clearInterval(intervals);
            setOnboardInit(false);
            console.log("balance cleared!!!");
          },
          address: async (newAddress) => {
            if (newAddress) {
              dispatch(clearCRatio());
              dispatch(clearBalances());
              await contracts.connect(newAddress);
              // console.log("newAddress", newAddress, networkId);
              dispatch(updateAddress({ address: newAddress }));
              dispatch(updateIsConnect(true));
              // } else {
              // 	onboard.walletReset();
              // }
            }
          },
          network: async (network) => {
            if (network) {
              const newNetworkId = Number(network);
              if (SUPPORTED_NETWORKS[newNetworkId]) {
                await contracts.init(newNetworkId);
                dispatch(updateNetwork({ networkId: newNetworkId }));
                return true;
              } else {
                clearInterval(intervals);
                dispatch(updateNetwork({ networkId: newNetworkId }));
                NotificationManager.warning(
                  `This network${newNetworkId} is not supported. Please change to polygon, bsc, moonriver or ethereum network`,
                  "ERROR"
                );

                localStorage.removeItem("selectedWallet");
                // dispatch(clearWallet());
                dispatch(clearCRatio());
                dispatch(clearBalances());
                dispatch(updateVestable({ vestable: false }));
                // await contracts.clear();
                // console.log("balance cleared!!!");
                return false;
              }
            }
          },
        },
        themeState,
        true
      );
    } catch (e) {
      console.log(e);
      localStorage.clear();
      // window.location.reload()
    }

    const selectedWallet = localStorage.getItem("selectedWallet");
    if (selectedWallet) {
      try {
        await web3Onboard.connect(selectedWallet);
      } catch (e) {
        console.log(e);
      }
    }
    setOnboardInit(true);
  };

  useEffect(() => {
    if (transaction.hash) {
      const getState = async () => {
        await contracts.provider.once(transaction.hash, async (transactionState: any) => {
          if (transactionState.status !== 1) {
            NotificationManager.remove(NotificationManager.listNotify[0]);
            NotificationManager.warning(`${transaction.type} error`, "ERROR");
          } else {
            NotificationManager.remove(NotificationManager.listNotify[0]);
            NotificationManager.success(`${transaction.type} success`, "SUCCESS");
            dispatch(resetTransaction());
            await getSystemData();
          }
        });
      };

      getState();

      NotificationManager.info(transaction.message, "Transaction Executing", 0);
      // setTimeout(() => NotificationManager.remove(NotificationManager.listNotify[0]), 3000);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction]);

  useEffect(() => {
    if (!onboardInit) {
      setOnboard();
    }
    dispatch(updateThemeStyles(themeState));

    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (timer) {
      clearTimeout(timer);
    }

    if (intervals) {
      clearInterval(intervals);
    }

    if (!address || !onboardInit || networkId === 0) return;

    setTimer(setTimeout(() => getSystemData(), 0));

    setIntervals(setInterval(() => getSystemData, intervalTime));

    return () => clearInterval(intervals);
    // eslint-disable-next-line
  }, [networkId, address, onboardInit]);

  useEffect(() => {
    if (!address && !isReady) {
      dispatch(clearBalances());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

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

/* function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
} */
