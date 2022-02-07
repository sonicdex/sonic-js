import { Pair } from '@/declarations/pair';
import BigNumber from 'bignumber.js';
import { exponential, removeDecimals, toBigNumber, Types } from '..';

export class Liquidity {
  /**
   * Constant from Swap Canister
   */
  static readonly MINIMUM_LIQUIDITY = exponential(3);

  /**
   * Calculate the pair decimals for given tokens decimals
   */
  static getPairDecimals(
    token0Decimals: Types.Decimals,
    token1Decimals: Types.Decimals
  ): Types.Decimals {
    return toBigNumber(token0Decimals)
      .plus(token1Decimals)
      .dividedBy(2)
      .dp(0, BigNumber.ROUND_FLOOR)
      .toNumber();
  }

  /**
   * Calculate the Liquidity Position for given amounts of a pair of tokens that is going to be added
   */
  static getAddPosition(params: Liquidity.GetAddPositionParams): BigNumber {
    const amount0Desired = removeDecimals(
      params.token0Amount,
      params.token0Decimals
    );
    const amount1Desired = removeDecimals(
      params.token1Amount,
      params.token1Decimals
    );
    const reserve0 = toBigNumber(params.reserve0);
    const reserve1 = toBigNumber(params.reserve1);
    const totalSupply = toBigNumber(params.totalSupply);

    let amount0: BigNumber;
    let amount1: BigNumber;

    if (reserve0.isZero() && reserve1.isZero()) {
      amount0 = amount0Desired;
      amount1 = amount1Desired;
    } else {
      const amount1Optimal = amount0Desired
        .multipliedBy(reserve1)
        .dividedBy(reserve0);
      if (amount1Desired.isGreaterThanOrEqualTo(amount1Optimal)) {
        amount0 = amount0Desired;
        amount1 = amount1Optimal;
      } else {
        const amount0Optimal = amount1Desired
          .multipliedBy(reserve0)
          .dividedBy(reserve1);
        amount0 = amount0Optimal;
        amount1 = amount1Desired;
      }
    }

    let lp: BigNumber;

    if (totalSupply.isZero()) {
      lp = amount0.multipliedBy(amount1).sqrt().minus(this.MINIMUM_LIQUIDITY);
    } else {
      const one = amount0.times(totalSupply).div(reserve0);
      const two = amount1.times(totalSupply).div(reserve1);

      lp = BigNumber.min(one, two);
    }

    return lp.dp(0);
  }

  /**
   * Calculate the Liquidity Position percentage that is going to be received for adding an amount of pair of tokens
   */
  static getAddPercentage(params: Liquidity.GetPercentageParams): BigNumber {
    const totalSupply = toBigNumber(params.totalSupply);

    if (totalSupply.isZero()) {
      return new BigNumber(1);
    }

    const lp = this.getAddPosition(params);
    const percentage = lp.dividedBy(lp.plus(totalSupply));

    return percentage;
  }

  /**
   * Calculate the token balances for given pair Liquidity Position
   */
  static getTokenBalances({
    pair,
    lpBalance,
  }: Liquidity.GetTokenBalancesParams): Liquidity.GetTokenBalancesResult {
    const balancePercentage = toBigNumber(lpBalance).dividedBy(
      toBigNumber(pair.totalSupply)
    );

    const token0Balance = toBigNumber(pair.reserve0)
      .multipliedBy(balancePercentage)
      .dp(0);
    const token1Balance = toBigNumber(pair.reserve1)
      .multipliedBy(balancePercentage)
      .dp(0);

    return {
      token0: token0Balance,
      token1: token1Balance,
    };
  }
}

export namespace Liquidity {
  export interface GetAddPositionParams {
    token0Amount: Types.Amount;
    token1Amount: Types.Amount;
    token0Decimals: Types.Decimals;
    token1Decimals: Types.Decimals;
    reserve0: Types.Number;
    reserve1: Types.Number;
    totalSupply: Types.Number;
  }

  export type GetPercentageParams = GetAddPositionParams;

  export interface GetTokenBalancesParams {
    pair: Pair.Model;
    lpBalance: Pair.Balance;
  }

  export interface GetTokenBalancesResult {
    token0: BigNumber;
    token1: BigNumber;
  }
}