import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { useTranslation } from 'react-i18next';

import { updateWallet, clearWallet } from 'config/reducers/wallet'
import { updateIsConnected } from 'config/reducers/wallet/isConnectedWallet'
import { changeAccount } from 'helpers/wallet/change'
import { NotificationManager } from 'react-notifications';
import { setIsLoading } from 'config/reducers/app'
import { connectHelper } from 'helpers/wallet/connect'
import { SUPPORTED_WALLETS } from 'helpers/wallet'
import detectEthereumProvider from '@metamask/detect-provider';

import * as S from './styles'

const Login = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const history = useHistory();
    const [isMetamask, setIsMetamask] = useState(false);

    useEffect(() => {
        const init = async () => {
            dispatch(setIsLoading(true));
            dispatch(clearWallet());
		    dispatch(updateIsConnected(false));
            if(await detectEthereumProvider()){
                setIsMetamask(true);
            }
            dispatch(setIsLoading(false));
        }
        init();
        // eslint-disable-next-line
    }, []);
    

    const onWalletClick = (walletType) => {
        return (async () => {
            try {
                if(isMetamask === false) {
                    NotificationManager.error('install metamask first.', 'wallet connection error', 5000);
                    NotificationManager.error('if metamask already installed, try refeshing', 'wallet connection error', 5000, () => {
                        window.location.reload();
                    });
                    return false;
                }
                const currentWallet = await connectHelper(walletType);
                dispatch(updateWallet(currentWallet));
                
                if((currentWallet.unlocked && walletType === 'Metamask') || walletType === 'Coinbase') {
                    
                    changeAccount(async () => {
                        const connect = await connectHelper(walletType);
                        dispatch(updateWallet(connect));
                    }, () => dispatch(clearWallet()));
                    dispatch(updateIsConnected(true));
                    history.push('/#')
                } else {
                    history.push('/walletConnection')
                }
            } catch (e) {
                NotificationManager.error('Could not get addresses from wallet', 'wallet connection error', 5000)
                console.log(e)
            }
        })();
    }

    const SUPPORTED_WALLETS_MAP = Object.values(SUPPORTED_WALLETS);
    
    return (
        
        <S.LoginMainContainer>
            <S.IntroContainer>
                <S.IntroTitle>
                    {t('login.intro.title')}
                </S.IntroTitle>
                <S.IntroSubTitle weigth={"regular"}>
                    {t('login.intro.subTitle')}
                </S.IntroSubTitle>
            </S.IntroContainer>
            <S.ButtonContainer>
            {SUPPORTED_WALLETS_MAP.map(walletType => {
                return (
                    <S.WalletButton
                        key={walletType}
                        onClick={() => onWalletClick(walletType)}
                    >
                        <S.WalletIcon src={`images/wallets/${walletType.toLowerCase()}.svg`} />
                        <S.WalletText weigth={"balck"}>{walletType.toUpperCase()}</S.WalletText>
                    </S.WalletButton>
                );
            })}
            </S.ButtonContainer>
            <S.LineOrContainer>
                <S.Line></S.Line>
                <S.TextOr color={'primary'}>or</S.TextOr>
                <S.Line></S.Line>
            </S.LineOrContainer>
            <S.Link href="https://www.pynths.com" target="_blank">
                <S.LinkText weigth={"bold"}>
                    {t('login.linkToPynths')}
                </S.LinkText>
            </S.Link>
        </S.LoginMainContainer>
    );
}

export default Login;