import { utils } from 'ethers'

export const currencyToPynths = (amount, issuanceRatio, exchangeRates) => {
    if(isNaN(Number(amount)) || amount === "") {
        amount = '0';
    }
    
    amount = typeof amount === "string" ? utils.parseEther(amount) : amount;
    issuanceRatio = typeof issuanceRatio === "string" ? utils.parseEther(issuanceRatio) : issuanceRatio;
    exchangeRates = typeof exchangeRates === "string" ? utils.parseEther(exchangeRates) : exchangeRates;
    if(
        amount.eq(utils.parseEther('0'))
    )  {
        return utils.parseEther('0');
    }

    try {
        return (amount).mul(exchangeRates).mul(100).div(issuanceRatio);
    } catch(e) {
        return utils.bigNumberify('0');
    }
    
}