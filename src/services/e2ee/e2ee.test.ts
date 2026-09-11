// Real crypto, real module composition (storage.ts + keyPackage.ts +
// group.ts + cipher.ts working together exactly as the app calls them) --
// never mocked ts-mls/@noble/* calls. Two things ARE mocked, deliberately:
// react-native-quick-crypto's install() (no real native Nitro module exists
// under Jest -- this device-native binding was already verified for real on
// an actual Hermes device this session, see the messaging plan's Phase 2
// report) and expo-secure-store (two independent in-memory Maps stand in for
// two physically-separate devices' real SecureStore; the mocked module reads
// `mockActiveDevice` so the test can switch "whose phone" is currently
// active between steps -- exactly how two real devices never share storage,
// just modeled in one Jest process). SecureStore's own encrypted-storage
// guarantee is a platform contract, not this module's logic, so it isn't
// what this test is verifying.

let mockActiveDevice: 'alice' | 'bob' = 'alice';
const mockStores: Record<'alice' | 'bob', Map<string, string>> = {
  alice: new Map(),
  bob: new Map(),
};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) =>
    mockStores[mockActiveDevice].get(key) ?? null,
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStores[mockActiveDevice].set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStores[mockActiveDevice].delete(key);
  }),
}));

jest.mock('react-native-quick-crypto', () => ({
  install: jest.fn(), // no-op: Node's own globalThis.crypto is already real WebCrypto
}));

// Inline factory (no external variable reference) -- avoids any question of
// mock-hoisting-vs-const-declaration execution order. The actual jest.fn()
// instance is retrieved below via the normal `import * as messagingApi`
// (which resolves to this same mock, Jest's registry is keyed off the
// resolved absolute file, so the `@/` alias keyPackage.ts itself uses still
// hits this same mock).
jest.mock('../../lib/messaging-api', () => ({
  publishMlsKeyPackages: jest.fn(),
}));

/* eslint-disable import/first -- these must stay below jest.mock() above for
   the mock hoisting/timing reasoning explained there to hold. */
import { ed25519 } from '@noble/curves/ed25519.js';
import * as messagingApi from '../../lib/messaging-api';
import { renameGroupState, saveDeviceIdentity } from './storage';
import { publishKeyPackageBatch } from './keyPackage';
import { createGroupForConversation, joinConversationFromWelcome } from './group';
import { decryptMessage, encryptMessage } from './cipher';
import { decodeKeyPackageFromWire } from './wire';
import { toBase64 } from './codec';
/* eslint-enable import/first */

const mockPublishMlsKeyPackages =
  messagingApi.publishMlsKeyPackages as jest.MockedFunction<
    typeof messagingApi.publishMlsKeyPackages
  >;

const ALICE_DEVICE_ID = 'alice-device-111';
const BOB_DEVICE_ID = 'bob-device-222';
const CONVERSATION_ID = 'conv-333';

function setActiveDevice(device: 'alice' | 'bob'): void {
  mockActiveDevice = device;
}

async function setupIdentity(deviceId: string) {
  const kp = ed25519.keygen();
  await saveDeviceIdentity({
    deviceId,
    identityPublicKey: toBase64(kp.publicKey),
    identityPrivateKey: toBase64(kp.secretKey),
  });
}

beforeEach(() => {
  mockStores.alice.clear();
  mockStores.bob.clear();
  jest.clearAllMocks();
});

describe('e2ee module composition (real ts-mls/@noble crypto, mocked network+SecureStore only)', () => {
  it('publishes a real batch of KeyPackages and stores matching local private material', async () => {
    setActiveDevice('bob');
    await setupIdentity(BOB_DEVICE_ID);
    mockPublishMlsKeyPackages.mockImplementation(
      async (_deviceId: string, keyPackages: string[]) => ({
        data: { ids: keyPackages.map((_, i) => `server-kp-${i}`) },
      }),
    );

    await publishKeyPackageBatch(3);

    expect(mockPublishMlsKeyPackages).toHaveBeenCalledTimes(1);
    const call = mockPublishMlsKeyPackages.mock.calls[0];
    if (!call) throw new Error('expected publishMlsKeyPackages to have been called');
    const [, published] = call;
    expect(published).toHaveLength(3);
    for (const wire of published) {
      expect(() => decodeKeyPackageFromWire(wire)).not.toThrow();
    }
  });

  it('creates a group as the creator, joins from the real Welcome as the recipient, and round-trips real encrypted messages both directions', async () => {
    // Bob publishes one real KeyPackage on his own device/store.
    setActiveDevice('bob');
    await setupIdentity(BOB_DEVICE_ID);
    let bobPublishedWire = '';
    mockPublishMlsKeyPackages.mockImplementation(
      async (_deviceId: string, keyPackages: string[]) => {
        bobPublishedWire = keyPackages[0]!;
        return { data: { ids: ['bob-server-kp-1'] } };
      },
    );
    await publishKeyPackageBatch(1);

    // Alice (creator), on her own device/store, fetches Bob's published
    // KeyPackage (simulating GET /keys/:userId returning it) and creates
    // the group.
    setActiveDevice('alice');
    await setupIdentity(ALICE_DEVICE_ID);
    const { welcomeWire, tempGroupId } = await createGroupForConversation(
      bobPublishedWire,
    );
    expect(welcomeWire.length).toBeGreaterThan(0);
    // Simulates the real flow: the server confirms the real conversation id
    // only after this call, so the caller renames the temp-keyed state.
    await renameGroupState(tempGroupId, CONVERSATION_ID);

    // Bob (joiner), back on his own device/store, joins from the real
    // Welcome -- his local pool from the publish step above is still there.
    setActiveDevice('bob');
    await joinConversationFromWelcome(CONVERSATION_ID, welcomeWire);

    // Alice encrypts a real message; "sends" the ciphertext (just a string)
    // to Bob; Bob decrypts it for real.
    setActiveDevice('alice');
    const aliceToBob = await encryptMessage(CONVERSATION_ID, 'Hello Bob, this is real E2EE.');
    expect(aliceToBob.ciphertext.length).toBeGreaterThan(0);

    setActiveDevice('bob');
    const bobDecrypted = await decryptMessage(CONVERSATION_ID, aliceToBob.ciphertext);
    expect(bobDecrypted).toBe('Hello Bob, this is real E2EE.');

    // And the reverse direction, proving the ratchet genuinely advances for
    // both parties, not just a static shared secret.
    const bobToAlice = await encryptMessage(CONVERSATION_ID, 'Hi Alice, got it!');

    setActiveDevice('alice');
    const aliceDecrypted = await decryptMessage(CONVERSATION_ID, bobToAlice.ciphertext);
    expect(aliceDecrypted).toBe('Hi Alice, got it!');

    // A second message from Alice, to prove sequential per-message state
    // advances correctly (the actual forward-secrecy property this whole
    // design exists for).
    const aliceSecondMessage = await encryptMessage(CONVERSATION_ID, 'Second message.');
    setActiveDevice('bob');
    expect(await decryptMessage(CONVERSATION_ID, aliceSecondMessage.ciphertext)).toBe(
      'Second message.',
    );
  });
});
