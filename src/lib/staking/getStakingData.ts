import { utils } from 'ethers';
import numbro from 'numbro';
import { pynthetix, USDC } from 'lib';
import { getBalance } from 'helpers/wallet/getBalance'

const currenciesToBytes = {
    PERI: utils.formatBytes32String('PERI'),
    pUSD: utils.formatBytes32String('pUSD'),
    USDC: utils.formatBytes32String('USDC'),
}

export type StakingData = {
    issuanceRatio: string,
    exchangeRates: {
        PERI: string,
        USDC: string,
    }, 
    issuable: {
        pUSD: string,
        USDC: string,
        all: string,
    },
    stakeable: {
        USDC: string,
        PERI: string,
    },
    balances: {
        debt: string,
        USDC: string,
        PERITotal: string
        pUSD: string,
        transferablePERI: string,
    },
    stakedAmount: {
        USDC: string
    },
    allowance: {
        USDC: string
    }
}

export const getStakingData = async (currentWallet) => {
    const { js: { PeriFinance, Issuer, ExchangeRates } }  = pynthetix as any;
    try {
        const balances = {
            debt: utils.formatEther(await PeriFinance.debtBalanceOf(currentWallet, currenciesToBytes['pUSD'])),
            USDC: (await USDC.balanceOf(currentWallet)).toString(),
            PERITotal: utils.formatEther(await PeriFinance.collateral(currentWallet)),
            transferablePERI: utils.formatEther(await PeriFinance.transferablePeriFinance(currentWallet)),
            pUSD: utils.formatEther(await getBalance(currentWallet, 'pUSD')),
        }
        
        const stakedAmount = {
            USDC: numbro(await PeriFinance.usdcStakedAmountOf(currentWallet)).divide(10**6).value().toString(),
        }
    
        const issuanceRatio = utils.formatEther(await Issuer.issuanceRatio());
        
        const exchangeRates = {
            PERI: utils.formatEther(await ExchangeRates.rateForCurrency(currenciesToBytes['PERI'])),
            USDC: utils.formatEther(await ExchangeRates.rateForCurrency(currenciesToBytes['USDC'])),
        }
        
        const issuablepUSD = utils.formatEther((await PeriFinance.remainingIssuablePynths(currentWallet))[0].toString());
    
        let stakeableUSDC = numbro(await PeriFinance.availableUSDCStakeAmount(currentWallet)).divide(10**6).value().toString();
    
        if(stakeableUSDC > balances['USDC']) {
            stakeableUSDC = balances['USDC']
        }
    
        const issuable = {
            pUSD: numbro(issuablepUSD).subtract(numbro(stakedAmount['USDC']).multiply(numbro(issuanceRatio).value())
                .multiply(numbro(exchangeRates['USDC']).value()).value()).value().toString(),
            USDC: numbro(stakeableUSDC).multiply(numbro(issuanceRatio).value()).multiply(numbro(exchangeRates['USDC']).value()).format({mantissa: 6}),
            all: numbro(issuablepUSD).value().toString()
            
        }
    
        const stakeable = {
            USDC: '0.00',
            PERI: balances.transferablePERI
        };
    
        const allowance = {
            USDC: await USDC.allowance(currentWallet)
        };
        return {
            balances,
            issuanceRatio,
            exchangeRates,
            issuable,
            stakedAmount,
            stakeable,
            allowance
        }
        
    } catch(e) {
        return {
            issuanceRatio: '0.000000',
            exchangeRates: {
                PERI: '0.000000',
                USDC: '0.000000',
            }, 
            issuable: {
                pUSD: '0.000000',
                USDC: '0.000000',
                all: '0.000000',
            },
            stakeable: {
                USDC: '0.000000',
                PERI: '0.000000',
            },
            balances: {
                debt: '0.000000',
                USDC: '0.000000',
                PERITotal: '0.000000',
                pUSD: '0.000000',
                transferablePERI: '0.000000',
            },
            stakedAmount: {
                USDC: '0.000000'
            },
            allowance: {
                USDC: '0.000000'
            }
        }
    }
    
    
    
}