/**
 * Soroban **Stellar Asset Contract (SAC)** IDs on testnet.
 * SAC addresses are StrKeys starting with `C`; each maps to a classic asset (or native XLM).
 *
 * References:
 * - Community directory: https://github.com/JoseCToscano/stellar-mcp/blob/main/STELLAR_TOKENS_SAC.md
 * - Stellar docs — SAC: https://soroban.stellar.org/docs/tokens/stellar-asset-contract
 *
 * **USDC (recommended for “dollar” demos)** — Circle test USDC, 7 decimals.
 * Classic asset: `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
 */
export const TESTNET_USDC_SAC =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

/** Native XLM as a Soroban token (7 decimals). Use when you want no issuer/trustline setup for XLM-only flows. */
export const TESTNET_NATIVE_XLM_SAC =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
