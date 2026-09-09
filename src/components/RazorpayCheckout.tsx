// Razorpay's own hosted Standard Checkout (checkout.js), run inside a WebView --
// the standard integration path for an Expo *managed* app (no native module/custom
// dev client needed, unlike react-native-razorpay). This modal's success/failure
// callback is NEVER treated as "the payment succeeded" -- per
// backend/PaymentsService's own rule, only the server-to-server Razorpay webhook
// ever confirms a payment. All this does is close the sheet and tell the caller to
// go re-check the real state.
//
// Methods are explicitly restricted to netbanking/card/upi -- the only three
// payment_mode_check values a Razorpay-sourced payment can honestly be recorded as
// (see mapRazorpayMethod in the backend's parent-fees.service.ts); wallet/EMI/
// pay-later are switched off here rather than left to silently mislabel themselves.

import { Modal, View, StyleSheet, ActivityIndicator, Pressable, Text } from 'react-native';
import WebView from 'react-native-webview';
import Svg, { Path } from 'react-native-svg';
import { parentColors } from '@/lib/theme';

export interface RazorpayOrderInfo {
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountPaise: string;
  schoolName: string;
}

export type RazorpayCheckoutResult =
  | { type: 'success' }
  | { type: 'failed'; message?: string }
  | { type: 'dismiss' };

function buildCheckoutHtml(order: RazorpayOrderInfo, prefill: { name?: string; email?: string }): string {
  const options = {
    key: order.razorpayKeyId,
    amount: order.amountPaise,
    currency: 'INR',
    name: order.schoolName,
    description: 'Fee payment',
    order_id: order.razorpayOrderId,
    prefill: { name: prefill.name ?? '', email: prefill.email ?? '' },
    method: { netbanking: true, card: true, upi: true, wallet: false, paylater: false, emi: false },
    theme: { color: '#2A62F0' },
  };
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#fff">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = ${JSON.stringify(options)};
  options.handler = function (response) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', response: response }));
  };
  options.modal = {
    ondismiss: function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
    }
  };
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function (response) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'failed', error: (response && response.error) || null }));
  });
  rzp.open();
</script>
</body></html>`;
}

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function RazorpayCheckout({
  visible,
  order,
  prefill,
  onResult,
  onRequestClose,
}: {
  visible: boolean;
  order: RazorpayOrderInfo | null;
  prefill: { name?: string; email?: string };
  onResult: (result: RazorpayCheckoutResult) => void;
  onRequestClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onRequestClose} presentationStyle="pageSheet">
      <View style={styles.bar}>
        <Pressable onPress={onRequestClose} style={styles.closeButton} hitSlop={8}>
          <CloseIcon />
        </Pressable>
        <Text style={styles.barTitle}>Secure checkout</Text>
        <View style={styles.closeButton} />
      </View>
      {order ? (
        <WebView
          source={{ html: buildCheckoutHtml(order, prefill) }}
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data);
              if (payload.type === 'success') onResult({ type: 'success' });
              else if (payload.type === 'failed') onResult({ type: 'failed', message: payload.error?.description });
              else onResult({ type: 'dismiss' });
            } catch {
              onResult({ type: 'dismiss' });
            }
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={parentColors.blue} />
            </View>
          )}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: parentColors.blueDeep,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  barTitle: { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
