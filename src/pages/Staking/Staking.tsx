import { useEffect, useState, useCallback} from 'react';
import { useSelector, useDispatch } from "react-redux";
import { NotificationManager } from 'react-notifications';

import { RootState } from 'config/reducers'
import { setIsLoading } from 'config/reducers/app'
import { updateTransaction } from 'config/reducers/transaction'

import { StakingData, getStakingData, pynthetix, getEstimateCRatio, getStakingAmount, getCurrencyFormat, USDC } from 'lib'
import { utils } from 'ethers'
import { useHistory } from 'react-router-dom'
import { gasPrice } from 'helpers/gasPrice'


import numbro from 'numbro'

import styled from 'styled-components'
import Action from 'screens/Action'
import Input from 'components/Input'
import { BlueGreenButton, LightBlueButton } from 'components/Button'
import { H4, H5 } from 'components/Text'
import Fee from 'components/Fee'
import { ActionContainer } from 'components/Container'

const Staking = () => {
    const dispatch = useDispatch();
    const history = useHistory();
    const { currentWallet } = useSelector((state: RootState) => state.wallet);
    const { seletedFee } = useSelector((state: RootState) => state.seletedFee);
    
    const [stakingData, setStakingData] = useState<StakingData>();
    const [estimateCRatio, setEstimateCRatio] = useState<string>("0");
    const [stakingAmount, setStakingAmount] = useState<{PERI?: string, USDC?: string}>({
        PERI: "0",
        USDC: "0"
    });

    const [maxStakingAmount , setMaxStakingAmount] = useState<{USDC?: string, PERI?: string}>({
        USDC: "0",
        PERI: "0"
    });

    const [mintingAmount, setMintingAmount] = useState<{pUSD: string}>({
        pUSD: "0"
    });
    
    const [maxMintingAmount, setMaxMintingAmount] = useState<{pUSD?: string}>({
        pUSD: "0"
    });

    const [gasLimit, setGasLimit] = useState<number>(0);
    const [needApprove, setNeedApprove] = useState<boolean>(false);

    const { js: { PeriFinance } }  = pynthetix as any;

    const getIssuanceData = useCallback(async () => {
        dispatch(setIsLoading(true));
        try {
            const data = await getStakingData(currentWallet);
            setStakingData(data);
            setMaxMintingAmount({
                pUSD: data.issuable['pUSD'],
            });
        
            setMaxStakingAmount({
                USDC: data.stakeable['USDC'],
                PERI: data.stakeable['PERI']
            });

            setEstimateCRatio(getEstimateCRatio(
                { 
                    PERITotalBalance: data.balances['PERITotal'], 
                    debtBalanceOf: data.balances['debt'],
                    exchangeRates: data.exchangeRates,
                    mintingAmount: 0,
                }
            ));
        } catch(e) {
            console.log(e);
        }

        dispatch(setIsLoading(false));
        // eslint-disable-next-line
    }, [currentWallet])

    useEffect(() => {
        const init = async() => {
            await getIssuanceData();            
        }
        
        init();
        // eslint-disable-next-line
    } ,[currentWallet]);
    
    const setMintAmount = (value, isMax = false) => {
        value = value.replace(/\,/g, '');
        
        if((/\./g).test(value)) {
            value = value.match(/\d+\.\d{0,2}/g)[0];
        }
        
        if(isNaN(Number(value)) || value === "") {
            setMintingAmount({pUSD: ''});
            setStakingAmount( { PERI: "0.00", USDC: getCurrencyFormat(stakingAmount['USDC']) } );

            setEstimateCRatio(getEstimateCRatio(
                { 
                    PERITotalBalance: stakingData.balances['PERITotal'], 
                    debtBalanceOf: stakingData.balances['debt'],
                    exchangeRates: stakingData.exchangeRates,
                    mintingAmount: 0,
                }
            ));

            return false;
        }
        
        if(numbro(maxMintingAmount['pUSD']).clone().subtract(numbro(value).value()).value() < 0 ) {
            value = (maxMintingAmount['pUSD']);
        }

        const {USDC, PERI} = getStakingAmount({
            issuanceRatio: stakingData.issuanceRatio,
            exchangeRates: stakingData.exchangeRates,
            mintingAmount: value,
            maxMintingAmount,
            stakingAmount,
            maxStakingAmount,
            type: 'pUSD'
        });
        
        
        setStakingAmount({USDC, PERI});
        setEstimateCRatio(getEstimateCRatio(
            { 
                PERITotalBalance: stakingData.balances['PERITotal'], 
                debtBalanceOf: stakingData.balances['debt'],
                exchangeRates: stakingData.exchangeRates,
                mintingAmount: value,
            }
        ));
        
        setMintingAmount({pUSD: isMax ? getCurrencyFormat(value) : value});
        // getGasEstimate();
    }

    const setAmountMax = () => {
        setMintAmount(maxMintingAmount['pUSD'], true);
    }

    const setUSDCAmount = (value, isMax = false) => {
        value = value.replace(/\,/g, '');
        
        if((/\./g).test(value)) {
            value = value.match(/\d+\.\d{0,2}/g)[0];
        }
        if(isNaN(Number(value)) || value === "") {
            setStakingAmount(getStakingAmount({
                issuanceRatio: stakingData.issuanceRatio,
                exchangeRates: stakingData.exchangeRates,
                mintingAmount: mintingAmount['pUSD'],
                maxMintingAmount,
                stakingAmount: {USDC: value, PERI: stakingAmount['PERI']},
                maxStakingAmount,
                type: 'USDC'
            }))
            setEstimateCRatio(getEstimateCRatio(
                { 
                    PERITotalBalance: stakingData.balances['PERITotal'], 
                    debtBalanceOf: stakingData.balances['debt'],
                    exchangeRates: stakingData.exchangeRates,
                    mintingAmount: mintingAmount['pUSD'],
                }
            ));
            return false;
        }
        
        //allowance check()
        if(numbro(stakingData.allowance['USDC']).subtract(numbro(value).value()).value() < 0) {
            setNeedApprove(true)
        }
        
        if(numbro(maxStakingAmount['USDC']).subtract(numbro(value).value()).value() < 0) {            
            value = getCurrencyFormat(maxStakingAmount['USDC']);
        }
        
        setStakingAmount(
            getStakingAmount({
                issuanceRatio: stakingData.issuanceRatio,
                exchangeRates: stakingData.exchangeRates,
                mintingAmount: mintingAmount['pUSD'],
                maxMintingAmount,
                stakingAmount: {USDC: value, PERI: stakingAmount['PERI']},
                maxStakingAmount,
                type: 'USDC'
            })
        );

        setEstimateCRatio(getEstimateCRatio(
            { 
                PERITotalBalance: stakingData.balances['PERITotal'], 
                debtBalanceOf: stakingData.balances['debt'],
                exchangeRates: stakingData.exchangeRates,
                mintingAmount: mintingAmount['pUSD'],
            }
        ));

        
    }

    const setUSDCAmountMax = () => {
        setUSDCAmount(maxStakingAmount['USDC'], true);
    } 

    const getGasEstimate = async () => {
        let estimateGasLimit;
        try {
            estimateGasLimit = await PeriFinance.contract.estimate.stakeUSDCAndIssuePynths(
                numbro(stakingAmount['USDC']).multiply(10**6).value().toString(),
                utils.parseEther(numbro(mintingAmount['pUSD']).value().toString())
            );
            
            setGasLimit(numbro(estimateGasLimit).multiply(1.2).value());
            
        } catch(e) {
            estimateGasLimit = 210000;
        }
        return numbro(estimateGasLimit).multiply(1.2).value();
    }
    const amountCheck = () => {
        const USDCtopUSD = numbro(stakingAmount['USDC']).divide(numbro(stakingData.exchangeRates['USDC']).value())
        const PERItopUSD = numbro(stakingAmount['PERI']).divide(numbro(stakingData.exchangeRates['PERI']).value())
        
        if(USDCtopUSD.add(PERItopUSD.value()).divide(numbro(stakingData.issuanceRatio).value()).subtract(numbro(mintingAmount['pUSD']).value()).value() === 0) {
            return true;
        } else {
            return false;
        }

        // 환율적용 계산하여 mintamount 계산
    }

    const onSaking = async () => {
        // dispatch(setIsLoading(true));
        
        const transactionSettings = {
            gasPrice: gasPrice(seletedFee.price),
			gasLimit: await getGasEstimate(),
        }
        if(!amountCheck()) {
            NotificationManager.error(`please check pUSD amount`, 'success');
            return false;
        }
        try {
            let transaction;
            
            transaction = await PeriFinance.issuePynthsAndStakeUSDC(
                utils.parseEther(numbro(mintingAmount['pUSD']).value().toString()),
                numbro(stakingAmount['USDC']).multiply(10**6).value().toString(),
                transactionSettings
            );

            history.push('/')
            dispatch(updateTransaction(
                {
                    hash: transaction.hash,
                    message: `Staked & Minted ${getCurrencyFormat(mintingAmount['pUSD'])} pUSD ${getCurrencyFormat(stakingAmount['USDC'])} USDC`,
                    type: 'Staked & Minted'
                }
            ));
        } catch(e) {
            console.log(e);
        }    
        dispatch(setIsLoading(false));
    }

    const approve = async () => {
        dispatch(setIsLoading(true));
        try {
            await USDC.approve();
            setNeedApprove(false);
            
        } catch (e) {

        }
        dispatch(setIsLoading(false));
        getIssuanceData();
    }
    return (
        <Action title="STAKING"
            subTitles={[
                "Mint pUSD by staking your PERI.",
                "This gives you a Collateralization Ratio and a debt, allowing you to earn staking rewards."
            ]}
        >
            <ActionContainer>
                <div>
                    <StakingInfoContainer>
                        <H5>Estimated C-Ratio: {estimateCRatio}%</H5>
                    </StakingInfoContainer>
                    
                    <Input key="pUSD"
                        currencyName="pUSD"
                        value={mintingAmount['pUSD']}
                        onChange={(event) => setMintAmount(event.target.value)}
                        onBlur={() => setMintingAmount({pUSD: getCurrencyFormat(mintingAmount['pUSD'])})}
                        maxAction={() => setAmountMax()}
                        maxAmount={maxMintingAmount['pUSD']}
                    />
                    <Input key="USDC"
                        currencyName="USDC"
                        value={stakingAmount['USDC']}
                        onChange={(event) => setUSDCAmount(event.target.value)}
                        onBlur={() => setStakingAmount({USDC: getCurrencyFormat(stakingAmount['USDC']), PERI: stakingAmount['PERI']})}
                        maxAction={() => setUSDCAmountMax()}
                        maxAmount={maxStakingAmount['USDC']}
                    />
                    <Input key="PERI"
                        currencyName="PERI"
                        disabled= {true}
                        value={stakingAmount['PERI']}
                    />                    
                </div>
                <div>
                    {
                        needApprove ? 
                        (<StakingButton onClick={ () => approve()}><H4 weigth="bold">Approve</H4></StakingButton>)
                        : (<StakingButton onClick={ () => onSaking()}><H4 weigth="bold">STAKE & MINT</H4></StakingButton>)
                    }
                    <Fee gasPrice={seletedFee.price} gasLimit={gasLimit}/>
                </div>
            </ActionContainer>
        </Action>
        
    );
}

const StakingInfoContainer = styled.div`
    padding: 0 10px;
    H5 {
       text-align: right;
    }
`

const StakingButton = styled(BlueGreenButton)`
    width: 100%;
    height: 50px;
`
export default Staking;