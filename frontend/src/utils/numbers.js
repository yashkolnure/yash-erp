export const toNum = (n) => Number(n?.$numberDecimal ?? n ?? 0);
export const fmtCurrency = (n, currency = '') =>
    `${currency ? currency + ' ' : ''}${toNum(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
export const fmtNum = (n) => toNum(n).toLocaleString('en-US');
