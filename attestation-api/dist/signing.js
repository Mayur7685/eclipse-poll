import { ecMulGenerator, jubjubPointX, jubjubPointY, transientHash, CompactTypeField, CompactTypeVector, } from '@midnight-ntwrk/compact-runtime';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
// Load .env before reading process.env — required because ESM hoists imports
// so dotenv.config() in server.ts runs AFTER this module's top-level code.
const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dir, '../.env') });
const JUBJUB_ORDER = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
function randomScalar() {
    return BigInt('0x' + crypto.randomBytes(32).toString('hex')) % JUBJUB_ORDER;
}
/**
 * Derive a deterministic Jubjub scalar from a 32-byte hex seed.
 * Used for the server signing keypair so it survives restarts.
 */
function scalarFromSeed(hexSeed) {
    const clean = hexSeed.replace(/^0x/, '').padStart(64, '0').slice(0, 64);
    return BigInt('0x' + clean) % JUBJUB_ORDER;
}
export function generateKeyPair() {
    const sk = randomScalar();
    return { sk, pk: ecMulGenerator(sk) };
}
/**
 * Server signing keypair.
 *
 * IMPORTANT: set ATTESTATION_SECRET_KEY in .env for persistence across restarts.
 * If not set, a random keypair is generated on each startup — this will invalidate
 * all previously issued attestations after a restart because the on-chain
 * `attestationPk` will no longer match.
 *
 * Format: ATTESTATION_SECRET_KEY=0x<64 hex chars>
 *
 * Generate once with: node -e "console.log('0x'+require('crypto').randomBytes(32).toString('hex'))"
 */
const SECRET_HEX = process.env.ATTESTATION_SECRET_KEY;
let SERVER_KEYPAIR;
if (SECRET_HEX && SECRET_HEX.replace(/^0x/, '').length >= 32) {
    const sk = scalarFromSeed(SECRET_HEX);
    SERVER_KEYPAIR = { sk, pk: ecMulGenerator(sk) };
    console.log('[signing] Using deterministic keypair from ATTESTATION_SECRET_KEY');
}
else {
    // Ephemeral keypair — only safe for first-time setup / testing
    SERVER_KEYPAIR = generateKeyPair();
    console.warn('[signing] WARNING: ATTESTATION_SECRET_KEY not set. Using ephemeral keypair.\n' +
        '         All attestations will be invalidated on server restart.\n' +
        '         Set ATTESTATION_SECRET_KEY in .env and call registerAttestationProvider() once.');
}
export function getProviderPublicKey() {
    return SERVER_KEYPAIR.pk;
}
// SchnorrHashInput<3> struct laid out as flat Vector<7, Field>:
// [ann_x, ann_y, pk_x, pk_y, msg[0], msg[1], msg[2]]
// Matches the transientHash call inside schnorr.compact schnorrVerify circuit.
const SCHNORR_HASH_TYPE = new CompactTypeVector(7, CompactTypeField);
function schnorrChallengeHash(ann_x, ann_y, pk_x, pk_y, msg) {
    return transientHash(SCHNORR_HASH_TYPE, [ann_x, ann_y, pk_x, pk_y, ...msg]);
}
export function signCredential(credType, pollIdHash, userPubKeyHash) {
    const { sk, pk } = SERVER_KEYPAIR;
    const k = randomScalar();
    const R = ecMulGenerator(k);
    const cFull = schnorrChallengeHash(jubjubPointX(R), jubjubPointY(R), jubjubPointX(pk), jubjubPointY(pk), [credType, pollIdHash, userPubKeyHash]);
    const c = cFull % TWO_248;
    const s = (((k + c * sk) % JUBJUB_ORDER) + JUBJUB_ORDER) % JUBJUB_ORDER;
    return { announcement: R, response: s, providerPk: pk, nonce: k };
}
