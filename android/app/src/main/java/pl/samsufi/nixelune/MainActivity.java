package pl.samsufi.nixelune;

import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Android 15+ is always edge-to-edge; this gives older versions the same layout,
        // with transparent bars and light icons over the ink window background.
        EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
        // Phones are locked to portrait; larger screens rotate freely (res bool by smallest width).
        setRequestedOrientation(getResources().getBoolean(R.bool.portrait_only)
            ? ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        super.onCreate(savedInstanceState);
    }
}
