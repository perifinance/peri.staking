import React from "react";
import { toggleNoti } from "config/reducers/liquidation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "config/reducers";
import { contracts } from "lib/contract";
import styled from "styled-components";
import Countdown from "react-countdown";

const Timer = () => {
  const dispatch = useDispatch();
  const { liquidation, timestamp } = useSelector(
    (state: RootState) => state.liquidation
  );
  const { address } = useSelector((state: RootState) => state.wallet);

  let toggleBtn = !liquidation;

  const setTime = 86400000; // 24
  let complete = false;

  const { Liquidations } = contracts as any;

  const onEscapeHandler = async () => {
    const stateLiquid = await Liquidations.isOpenForLiquidation(address);

    if (!stateLiquid) {
      console.log("이거 동작함?");
      await contracts.signers.Liquidations.removeAccountInLiquidation(address);
      dispatch(toggleNoti({ toggle: true, title: 0 }));
      toggleBtn = true;
      complete = true;
    } else {
      dispatch(toggleNoti({ toggle: true, title: 1 }));
      complete = false;
    }
  };

  const renderer = ({ hours, minutes, completed }) => {
    complete = completed;

    if (complete) {
      toggleBtn = true;
      return <span>00:00</span>;
    } else {
      return (
        <span>
          {hours}:{minutes}
        </span>
      );
    }
  };

  return (
    <TimerContainer>
      <Countdown
        date={timestamp === 0 ? setTime : timestamp + setTime}
        zeroPadTime={2}
        renderer={renderer}
      >
        <span>00:00</span>
      </Countdown>

      <EscapeBtn onClick={() => onEscapeHandler()} disabled={!toggleBtn}>
        Escape
      </EscapeBtn>
    </TimerContainer>
  );
};

const TimerContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  span {
    color: ${(props) => props.theme.colors.font["warning"]};
    font-size: 4rem;
    font-weight: bold;
  }
`;

const EscapeBtn = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  background: #2284e0;
  border: none;
  outline: none;
  font-size: 2rem;
  font-weight: bold;
  letter-spacing: 1px;
  width: 10rem;
  padding: 0.4rem 0.2rem;
`;

export default Timer;
