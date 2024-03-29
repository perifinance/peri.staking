import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "config/reducers";
import styled from "styled-components";
import { NotificationManager } from "react-notifications";

import { contracts } from "lib/contract";

import { H1 } from "components/heading";
import { RewardCard } from "components/card/RewardCard";
import { LPRewardCard } from "components/card/LPRewardCard";

import { Swiper, SwiperSlide } from "swiper/react";
import SwiperCore, { Mousewheel, Virtual } from "swiper/core";
import { addSeconds, formatDistanceToNow } from "date-fns";
import { updateTransaction } from "config/reducers/transaction";
import { setLoading } from "config/reducers/loading";
import { web3Onboard } from "lib/onboard";
import { formatCurrency } from "lib";
import { Title, StakeContainer, Container } from "../Mint/Mint";
// import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
// import networkFee from 'config/reducers/networkFee/networkFee';

SwiperCore.use([Mousewheel, Virtual]);

type ClaimData = {
  closeIn?: string;
  duration?: string;
  periods?: string;
  rewards?: {
    exchange: bigint;
    staking: bigint;
  };
  claimable?: boolean;
  isCloseFeePeriodEnabled?: boolean;
};

const Reward = () => {
  const dispatch = useDispatch();
  const [slideIndex, setSlideIndex] = useState(0);
  // const balancesIsReady = useSelector((state: RootState) => state.balances.isReady);
  const exchangeIsReady = useSelector((state: RootState) => state.exchangeRates.isReady);

  const { hash } = useSelector((state: RootState) => state.transaction);
  const { address, isConnect, networkId } = useSelector((state: RootState) => state.wallet);
  const { gasPrice } = useSelector((state: RootState) => state.networkFee);
  const { currentCRatio } = useSelector((state: RootState) => state.ratio);
  const { balances } = useSelector((state: RootState) => state.balances);
  const [claimData, setClaimData] = useState<ClaimData>({
    closeIn: "",
    duration: "0",
    periods: "0",
    rewards: {
      exchange: 0n,
      staking: 0n,
    },
    claimable: false,
    isCloseFeePeriodEnabled: false,
  });

  const [actions, setActions] = useState([]);
    

  const getFeePeriodCountdown = (recentFeePeriods, feePeriodDuration) => {
    const currentPeriodStart =
      recentFeePeriods && recentFeePeriods.startTime
        ? new Date(parseInt(recentFeePeriods.startTime) * 1000)
        : null;
    const currentPeriodEnd =
      currentPeriodStart && feePeriodDuration
        ? addSeconds(currentPeriodStart, feePeriodDuration)
        : null;

    return {
      closeIn: formatDistanceToNow(currentPeriodEnd),
      isCloseFeePeriodEnabled:
        Math.ceil(Date.now() / 1000) >
        Number(recentFeePeriods.startTime) + Number(feePeriodDuration),
    };
  };

  const getGasEstimate = async (name, type) => {
    let gasLimit = 600000n;
    dispatch(setLoading({ name: "gasEstimate", value: true }));
    if (name === "CLAIM") {
      try {
        gasLimit = BigInt((await contracts.signers.FeePool.estimateGas[type]()).toString());
      } catch (e) {
        console.log(e);
      }
    } else {
      try {
        gasLimit = BigInt((await contracts.signers.LP.contract.estimateGas.getReward()).toString());
      } catch (e) {
        console.log(e);
      }
    }
    dispatch(setLoading({ name: "gasEstimate", value: false }));
    return ((gasLimit * 12n) / 10n).toString();
  };

  const onCloseFeePeriod = async (name) => {
    if (name === "CLAIM") {
      try {
        const transaction = await contracts.signers.FeePool.closeCurrentFeePeriod({
          gasPrice: gasPrice.toString(),
          gasLimit: await getGasEstimate(name, "closeCurrentFeePeriod"),
        });

        dispatch(
          updateTransaction({
            hash: transaction.hash,
            message: `Close CurrentFeePeriod`,
            type: "Close CurrentFeePeriod",
          })
        );
      } catch (e) {
        console.log(e);
      }
    } else {
    }
  };

  const connectHelp = async () => {
    NotificationManager.error(`Please connect your wallet first`, "ERROR");
    try {
      await web3Onboard.connect();
    } catch (e) {}
  };

  const onClaim = async (name) => {
    if (!isConnect) {
      await connectHelp();
      return false;
    }

    const transactionSettings = {
      gasPrice: gasPrice.toString(),
      gasLimit: await getGasEstimate(name, "claimFees"),
    };

    let transaction;

    if (name === "CLAIM") {
      if (claimData.rewards.staking === 0n) {
        NotificationManager.error(`Claim Amount Zero`, "ERROR");
        return false;
      }

      const claimAble: boolean =
        currentCRatio === 0n ||
        (BigInt(Math.pow(10, 18).toString()) * 100n) / currentCRatio >= 399n;

      if (!claimAble) {
        NotificationManager.warning(
          "Your C-Ratio is under 400%, Try to burn your debt first",
          "ERROR",
          0
        );
        return false;
      }
      try {
        transaction = await contracts.signers.FeePool.claimFees(transactionSettings);
        dispatch(
          updateTransaction({
            hash: transaction.hash,
            message: `Claiming rewards ${formatCurrency(claimData.rewards.staking)}`,
            type: "CLAIM",
          })
        );
      } catch (e) {
        console.log(e);
      }
    } else {
      if (balances["LP"].rewardEscrow === 0n) {
        NotificationManager.error(`Claim Amount Zero`, "ERROR");
        return false;
      }

      transaction = await contracts.signers["LP"].getReward({
        gasPrice: gasPrice.toString(),
        gasLimit: await getGasEstimate(name, "closeCurrentFeePeriod"),
      });
      dispatch(
        updateTransaction({
          hash: transaction.hash,
          message: `LP rewards ${formatCurrency(balances["LP"].rewardEscrow)}`,
          type: "LP rewards",
        })
      );
    }
  };

  const getData = async () => {
    dispatch(setLoading({ name: "rewardData", value: true }));
    try {
      const duration = await contracts.FeePool.feePeriodDuration();
      const periods = await contracts.FeePool.recentFeePeriods(0);
      const claimable = address ? await contracts.FeePool.isFeesClaimable(address) : false;
      const reward = address ? await contracts.FeePool.feesAvailable(address) : [];
      //reward type  array[0] = exchange | array[1] = staking

      const { closeIn, isCloseFeePeriodEnabled } = getFeePeriodCountdown(periods, duration);

      setClaimData({
        closeIn,
        duration,
        periods,
        rewards: {
          exchange: isConnect ? BigInt(reward[0].toString()) : 0n,
          staking: isConnect ? BigInt(reward[1].toString()) : 0n,
        },
        claimable,
        isCloseFeePeriodEnabled,
      });
    } catch (e) {
      console.log(e);
    }

    dispatch(setLoading({ name: "rewardData", value: false }));
  };

  useEffect(() => {
    if (address && exchangeIsReady) {
      getData();
    } else {
      setClaimData({...claimData, rewards: {exchange: 0n, staking: 0n}});
    }
  }, [hash, isConnect, address, networkId, exchangeIsReady]);


  useEffect(() => {
    const actions = networkId === 1285
    ? [{ name: "CLAIM", component: RewardCard, data: claimData }]
    : [
        { name: "CLAIM", component: RewardCard, data: claimData },
        {
          name: "LP",
          component: LPRewardCard,
          data: {
            ...claimData,
            rewardEscrow: balances["LP"]?.rewardEscrow ? balances["LP"].rewardEscrow : 0n,
          },
        },
      ];
    setActions(actions);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkId, claimData, balances]);

  return (
    <Container>
      <Title $show={slideIndex === 0}>
        <H1>REWARD</H1>
      </Title>
      <RewardContainer>
        <Swiper
          spaceBetween={10}
          direction={"vertical"}
          slidesPerView={4}
          centeredSlides={true}
          mousewheel={true}
          allowTouchMove={true}
          breakpoints={{
            "1023": {
              allowTouchMove: false,
            },
          }}
          onSlideChange={({ activeIndex }) => setSlideIndex(activeIndex)}
          virtual
        >
          {actions.map((action, index) => (
            <SwiperSlide key={action.name} virtualIndex={index}>
              <action.component
                hide={index < slideIndex}
                isActive={index === slideIndex}
                actionName={action.name}
                periodAction={() => (isConnect ? onCloseFeePeriod(action.name) : connectHelp())}
                rewardAction={() => (isConnect ? onClaim(action.name) : connectHelp())}
                data={action.data}
              ></action.component>
            </SwiperSlide>
          ))}
        </Swiper>
      </RewardContainer>
    </Container>
  );
};

const RewardContainer = styled(StakeContainer)`
  .swiper-wrapper {
    top: -14% !important;
  }

  .swiper-slide.swiper-slide-next  {
    margin-top: 1.5% !important;
  }

  ${({ theme }) => theme.media.mobile`
    .swiper-wrapper {
      top: -3.5% !important;
    }
  `}
`;
export default Reward;
