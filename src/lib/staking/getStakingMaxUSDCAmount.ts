import { utils } from 'ethers'
import { pynthsToCurrency, calculator, currencyToPynths } from 'lib'

export const getStakingMaxUSDCAmount = ({mintingAmount, issuanceRatio, exchangeRates, stakeableUSDC}) => {
    const mintAmountToMaxUSDC = pynthsToCurrency(mintingAmount, issuanceRatio, exchangeRates['USDC']);

    return (utils.parseEther(stakeableUSDC)).lt(mintAmountToMaxUSDC) ? stakeableUSDC : utils.formatEther(mintAmountToMaxUSDC).toString();
}