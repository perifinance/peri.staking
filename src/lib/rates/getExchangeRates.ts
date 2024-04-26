import { contracts } from "lib/contract";
import { toBytes32 } from "lib/etc/utils";

export const getExchangeRates = async () => {
  const { ExchangeRates } = contracts as any;

  if (!ExchangeRates) {
    return {
      PERI: BigInt(0),
      USDC: BigInt(0),
      DAI: BigInt(0),
      USDT: BigInt(0),
      XAUT: BigInt(0),
      PAXG: BigInt(0),
    };
  }

  const keys = ["PERI", "USDC", "DAI"];

  if (contracts["XAUT"]) keys.push("XAUT");
  if (contracts["PAXG"]) keys.push("PAXG");
  if (contracts["USDT"]) keys.push("USDT");

  // console.log("keys", keys);

  const [PERI, USDC, DAI, XAUT, PAXG, USDT] = await ExchangeRates.ratesForCurrencies(
    keys.map(toBytes32)
  ).then((values) => values.map((value) => BigInt(value)));

  // console.log("rates", PERI, USDC, DAI, XAUT, PAXG, USDT);
  // const [PERI, USDC, DAI, XAUT, PAXG, USDT] = rates.map(feed => feed.toBigInt());

  return {
    PERI: PERI,
    USDC: USDC,
    DAI: DAI,
    USDT: USDT,
    XAUT: XAUT,
    PAXG: PAXG,
  };
};
