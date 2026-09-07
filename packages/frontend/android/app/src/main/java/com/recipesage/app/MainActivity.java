package com.recipesage.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent intent = getIntent();
        if (intent != null && intent.hasExtra("google.message_id")) {
            onNewIntent(intent);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (isSendIntent(intent)) {
            setIntent(intent);
            notifySendIntentReceived();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (isSendIntent(getIntent())) {
            setIntent(new Intent(Intent.ACTION_MAIN));
        }
    }

    private boolean isSendIntent(Intent intent) {
        if (intent == null) return false;
        String action = intent.getAction();
        return Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action);
    }

    private void notifySendIntentReceived() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().post(() ->
            getBridge().getWebView().evaluateJavascript(
                "window.dispatchEvent(new Event('sendIntentReceived'))", null));
    }
}
