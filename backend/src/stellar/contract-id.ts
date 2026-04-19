import { Address, hash, StrKey, xdr } from "@stellar/stellar-sdk";

/** Stellar contract ID (C…) for `createCustomContract` with the given deployer + salt. */
export function deriveCustomContractId(
  networkPassphrase: string,
  deployerAddress: string,
  salt: Buffer,
): string {
  const networkId = hash(Buffer.from(networkPassphrase, "utf8"));
  const addr = Address.fromString(deployerAddress);
  const inner = new xdr.HashIdPreimageContractId({
    networkId,
    contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
      new xdr.ContractIdPreimageFromAddress({
        address: addr.toScAddress(),
        salt,
      }),
    ),
  });
  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(inner);
  const raw = hash(preimage.toXDR());
  return StrKey.encodeContract(raw);
}
