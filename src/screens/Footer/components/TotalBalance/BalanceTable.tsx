import styled from 'styled-components'

import { useSelector } from "react-redux";
import { RootState } from 'config/reducers';

import { CellRight,
    CellLeft,
    Row,
    StyledTHeader,
    StyledTBody } from 'components/Table'
import Asset from 'components/Asset'
import { H6 } from 'components/Text'
import { TableContainer } from 'components/Container'
import { formatCurrency } from 'lib'


const BalanceTable = () => {
    // const { t } = useTranslation();
    const { transferables } = useSelector((state: RootState) => state.balances);
    const transferablesArray = Object.keys(transferables);
    const tableHeadding = ['COIN', 'TRANSFERABLE', '$USD']
    const borderColors = ['#5271FF', '#00F0FF', '#F8B62D'];
    return (
        <TableContainer>
            <StyledTHeader>
                {tableHeadding.map( headding => 
                    headding === 'COIN' ?
                    (<CellLeft key={headding}> <H6 align={"left"}>{headding}</H6> </CellLeft>) :
                    (<CellRight key={headding}> <H6 align={"right"}>{headding}</H6> </CellRight>)
                )}
            </StyledTHeader>
            <StyledTBody height={160}>
                {transferablesArray.length > 0 && transferablesArray.map( (currency, index) => {
                    
                    return (
                        <Row key={currency}>
                            <CellLeft>
                                <Flex>
                                    <Border borderColor={borderColors[index%3]}></Border>
                                    <Asset currencyName={currency} label={currency}></Asset>
                                </Flex>
                            </CellLeft>
                            <CellRight><H6 align={"right"}>{formatCurrency(transferables[currency].balance)}</H6></CellRight>
                            <CellRight><H6 align={"right"}>${formatCurrency(transferables[currency].balanceToUSD)}</H6></CellRight>
                        </Row>
                    )
                    }
                )}
            </StyledTBody>
        </TableContainer>
    );
}

const Border = styled.div<{borderColor: string}>`
    padding-left: 7px;
	border-left: 5px solid ${props => props.borderColor};
`;

const Flex = styled.div`
    display: flex;
`;

export default BalanceTable;