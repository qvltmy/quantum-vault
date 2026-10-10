export interface ProverInput {
  user_op_hash: string;
  public_key_hash: string;
  public_key: string;
  signature: string;
}

export interface ProverOutput {
  publicValues: string;  // 64 bytes: userOpHash || publicKeyHash
  proof: string;         // SP1 Groth16 proof bytes
  program_vkey: string;
}

const PROVER_URL = '/api/prove';

/**
 * Call the local SP1 prover service to generate a Groth16 proof.
 * The prover runs ML-DSA-65 verification inside SP1 guest and returns
 * publicValues + proofBytes that can be passed to cacheProof + verifyProof.
 */
export async function generateProof(input: ProverInput): Promise<ProverOutput> {
  const response = await fetch(PROVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errMsg = `Prover HTTP ${response.status}`;
    try {
      const err = await response.json();
      errMsg = err.error ?? errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  return {
    publicValues: data.public_values,
    proof: data.proof,
    program_vkey: data.program_vkey,
  };
}
