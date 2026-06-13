package com.zdechets.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Extend WebView behind status bar and nav bar so the map fills
        // the full screen and CSS env(safe-area-inset-*) carries the insets.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
