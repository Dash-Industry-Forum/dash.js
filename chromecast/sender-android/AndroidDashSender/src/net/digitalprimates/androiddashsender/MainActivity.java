package net.digitalprimates.androiddashsender;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.support.v7.app.MediaRouteButton;
import android.support.v7.media.MediaRouteSelector;
import android.support.v7.media.MediaRouter;
import android.support.v7.media.MediaRouter.RouteInfo;

import com.google.cast.CastContext;
import com.google.cast.CastDevice;
import com.google.cast.MediaRouteAdapter;
import com.google.cast.MediaRouteHelper;
import com.google.cast.MediaRouteStateChangeListener;

public class MainActivity extends Activity implements MediaRouteAdapter {

	// Variables
	private String APP_ID = "75215b49-c8b8-45ae-b0fb-afb39599204e";
	private CastContext context;
	private MediaRouter router;
	private MediaRouteSelector routeSelector;
    private MediaRouter.Callback routerCallback;
    private MediaRouteButton castButton;
    private CastDevice selectedDevice;
    private MediaRouteStateChangeListener stateListener;
	
	// Chromecast
	
	private void initCast() {
		castButton = (MediaRouteButton) findViewById(R.id.media_route_button);
		
		Context appContext = getApplicationContext();
		
		context = new CastContext(appContext);
		MediaRouteHelper.registerMinimalMediaRouteProvider(context, this);
		router = MediaRouter.getInstance(appContext);
		routeSelector = MediaRouteHelper.buildMediaRouteSelector(MediaRouteHelper.CATEGORY_CAST, APP_ID, null);
		castButton.setRouteSelector(routeSelector);
		routerCallback = new DashMediaRouterCallback();
		
		router.addCallback(routeSelector, routerCallback, MediaRouter.CALLBACK_FLAG_REQUEST_DISCOVERY);
	}
	
	private class DashMediaRouterCallback extends MediaRouter.Callback {
        @Override
        public void onRouteSelected(MediaRouter router, RouteInfo route) {
            MediaRouteHelper.requestCastDeviceForRoute(route);
        }

        @Override
        public void onRouteUnselected(MediaRouter router, RouteInfo route) {
            selectedDevice = null;
            stateListener = null;
        }
    }
	
	// MediaRouteAdapter Methods
	
    public void onDeviceAvailable(CastDevice device, String status, MediaRouteStateChangeListener listener) {
		// TODO : What is the string?
    	selectedDevice = device;
		stateListener = listener;
    }

    public void onSetVolume(double volume) {
        // Handle volume change.
    }

    public void onUpdateVolume(double delta) {
        // Handle volume change.
    }
	
	// Lifecycle
	
	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		
		setContentView(R.layout.activity_main);
		initCast();
	}
	
	@Override
    protected void onDestroy() {
        MediaRouteHelper.unregisterMediaRouteProvider(context);
        context.dispose();
        super.onDestroy();
    }
}
