package net.digitalprimates.androiddashsender;

import java.io.IOException;

import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.os.Bundle;
import android.support.v4.app.FragmentActivity;
import android.support.v7.app.MediaRouteButton;
import android.support.v7.media.MediaRouteSelector;
import android.support.v7.media.MediaRouter;
import android.support.v7.media.MediaRouter.RouteInfo;
import android.util.Log;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.CompoundButton;
import android.widget.ImageButton;
import android.widget.SeekBar;
import android.widget.SeekBar.OnSeekBarChangeListener;
import android.widget.Spinner;
import android.widget.ToggleButton;

import com.google.cast.ApplicationChannel;
import com.google.cast.ApplicationMetadata;
import com.google.cast.ApplicationSession;
import com.google.cast.CastContext;
import com.google.cast.CastDevice;
import com.google.cast.MediaRouteAdapter;
import com.google.cast.MediaRouteHelper;
import com.google.cast.MediaRouteStateChangeListener;
import com.google.cast.MessageStream;
import com.google.cast.SessionError;

public class MainActivity extends FragmentActivity implements MediaRouteAdapter {
	private String TAG = "DashTest";
	
	// Streams
	
	Spinner spinner;
	ToggleButton playPauseToggle;
	ToggleButton soundToggle;
	SeekBar volumeBar;
	SeekBar scrubBar;
	
	Boolean playbackStarted = false;
	Boolean playing = false;
	
	private class Stream {
		public String name;
		public String url;
		
		protected Stream(String n, String u) {
			name = n;
			url = u;
		}
		
		public String toString()
		{
			return name;
		}
	}
	
	private void populateStreams() {
		spinner = (Spinner) this.findViewById(R.id.streamOptions);
		
		Stream[] items = new Stream[] {	
			/*new Stream(
				"4K",
				"http://dash.edgesuite.net/akamai/test/tears1/tearsofsteel_4096x1714_14Mbps.mpd"
			),*/
			new Stream(
				"Fraunhofer - HEACC 2.0 - Dream",
	            "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_2_0_with_video/ElephantsDream/elephants_dream_480p_heaac2_0.mpd"
			), 
			new Stream(
				"Fraunhofer - HEACC 2.0 - Sintel",
	            "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_2_0_with_video/Sintel/sintel_480p_heaac2_0.mpd"
			), 
			new Stream(
				"Fraunhofer - HEACC 5.1 - 6 CH ID",
	            "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/6chId/6chId_480p_heaac5_1.mpd"
			), 
			new Stream(
				"Fraunhofer - HEACC 5.1 - Dream",
	            "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/ElephantsDream/elephants_dream_480p_heaac5_1.mpd"
			),
			new Stream(
				"Fraunhofer - HEACC 5.1 - Sintel",
	            "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/Sintel/sintel_480p_heaac5_1.mpd"
			), 
			new Stream(
				"Fraunhofer - Audio Only - Dream",
	            "http://dash.edgesuite.net/digitalprimates/fraunhofer/audio_only/heaac_2_0_without_video/ElephantsDream/elephants_dream_audio_only_heaac2_0.mpd"
			), 
			new Stream(
				"Fraunhofer - Audio Only - Sintel",
	            "http://dash.edgesuite.net/digitalprimates/fraunhofer/audio_only/heaac_2_0_without_video/Sintel/sintel_audio_only_heaac2_0.mpd"
			), 
			new Stream(
				"Envivio",
	            "http://dash.edgesuite.net/envivio/dashpr/clear/Manifest.mpd"
			),
			new Stream(
				"Segment List",
	            "http://www.digitalprimates.net/dash/streams/gpac/mp4-main-multi-mpd-AV-NBS.mpd"
			), 
			new Stream(
				"Segment Template",
	            "http://www.digitalprimates.net/dash/streams/mp4-live-template/mp4-live-mpd-AV-BS.mpd"
			), 
			new Stream(
				"Segment Template",
	            "http://www.digitalprimates.net/dash/streams/mp4-live-template/mp4-live-mpd-AV-BS.mpd"
			), 
			new Stream(
				"Unified Streaming - Timeline",
	            "http://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.mpd"
			),
			new Stream(
				"Microsoft #1",
	            "http://origintest.cloudapp.net/media/SintelTrailer_MP4_from_WAME/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)"
			), 
			new Stream(
				"Microsoft #2",
	            "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)"
			), 
			new Stream(
				"Microsoft #3",
	            "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_720p_Main_Profile/sintel_trailer-720p.ism/manifest(format=mpd-time-csf)"
			), 
			new Stream(
				"Microsoft #4",
	            "http://origintest.cloudapp.net/media/MPTExpressionData01/ElephantsDream_1080p24_IYUV_2ch.ism/manifest(format=mpd-time-csf)"
			),
			new Stream(
				"Microsoft #5",
	            "http://origintest.cloudapp.net/media/MPTExpressionData02/BigBuckBunny_1080p24_IYUV_2ch.ism/manifest(format=mpd-time-csf)"
			), 
			new Stream(
				"D-Dash #1",
	            "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=2&type=full"
			), 
			new Stream(
				"D-Dash #2",
	            "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=4&type=full"
			), 
			new Stream(
				"D-Dash #3",
	            "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=6&type=full"
			),
			new Stream(
				"D-Dash #4",
	            "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=8&type=full"
			), 
			new Stream(
				"D-Dash #5",
	            "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=10&type=full"
			), 
			new Stream(
				"D-Dash #6",
	            "http://www-itec.uni-klu.ac.at/dash/ddash/mpdGenerator.php?segmentlength=15&type=full"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 1a - Netflix",
	            "http://dash.edgesuite.net/dash264/TestCases/1a/netflix/exMPD_BIP_TC1.mpd"
			),
			new Stream(
				"DASH-AVC/264 Ð test vector 1a - Sony",
	            "http://dash.edgesuite.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 1b - Envivio",
	            "http://dash.edgesuite.net/dash264/TestCases/1b/envivio/manifest.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 1b - Thomson",
	            "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/2/manifest.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 1c - Envivio",
	            "http://dash.edgesuite.net/dash264/TestCases/1c/envivio/manifest.mpd"
			),
			new Stream(
				"DASH-AVC/264 Ð test vector 2a - Envivio",
	            "http://dash.edgesuite.net/dash264/TestCases/2a/envivio/manifest.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 2a - Sony",
	            "http://dash.edgesuite.net/dash264/TestCases/2a/sony/SNE_DASH_CASE_2A_SD_REVISED.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 2a - Thomson",
	            "http://dash.edgesuite.net/dash264/TestCases/2a/thomson-networks/2/manifest.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 3a - Fraunhofer",
	            "http://dash.edgesuite.net/dash264/TestCases/3a/fraunhofer/ed.mpd"
			),
			new Stream(
				"DASH-AVC/264 Ð test vector 3b - Fraunhofer",
	            "http://dash.edgesuite.net/dash264/TestCases/3b/fraunhofer/elephants_dream_heaac2_0.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 3b - Sony",
	            "http://dash.edgesuite.net/dash264/TestCases/3b/sony/SNE_DASH_CASE3B_SD_REVISED.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 4b - Sony",
	            "http://dash.edgesuite.net/dash264/TestCases/4b/sony/SNE_DASH_CASE4B_SD_REVISED.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 5a - Thomson/Envivio",
	            "http://dash.edgesuite.net/dash264/TestCases/5a/1/manifest.mpd"
			),
			new Stream(
				"DASH-AVC/264 Ð test vector 5b - Thomson/Envivio",
	            "http://dash.edgesuite.net/dash264/TestCases/5b/1/manifest.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 6c - Envivio Manifest 1",
	            "http://dash.edgesuite.net/dash264/TestCases/6c/envivio/manifest.mpd"
			), 
			new Stream(
				"DASH-AVC/264 Ð test vector 6c - Envivio Manifest 2",
	            "http://dash.edgesuite.net/dash264/TestCases/6c/envivio/manifest2.mpd"
			)
		};
		
		ArrayAdapter<Stream> streams = new ArrayAdapter<Stream>(
			this,
			android.R.layout.simple_spinner_item,
			items
		);
	        
        spinner.setAdapter(streams);
	}
	
	// Variables
	
	private String APP_ID = "75215b49-c8b8-45ae-b0fb-afb39599204e";
	private CastContext context;
	private MediaRouter router;
	private MediaRouteSelector routeSelector;
    private MediaRouter.Callback routerCallback;
    private MediaRouteButton castButton;
    private CastDevice selectedDevice;
    private MediaRouteStateChangeListener stateListener;
    private ApplicationSession session;
    private DashMessageStream messageStream;
	
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
	
	private class DashMessageStream extends MessageStream {
		private static final String NAMESPACE = "org.dashif.dashjs";
		
		protected DashMessageStream() {
	        super(NAMESPACE);
	    }
		
		@Override
		public void onMessageReceived(JSONObject obj) {
			Log.e(TAG, "got message " + obj);
			try {
				String event = obj.getString("event");
				String value = obj.getString("value");
				double d = Double.parseDouble(value);
				int num = (int) Math.floor(d);
				
				if (event.equals("timeupdate")) {
					scrubBar.setProgress(num);
				}
				else if (event.equals("durationchange")) {
					scrubBar.setMax(num);
				}
				else if (event.equals("ended")) {
					// TODO
				}
			}
			catch (JSONException e) {
				
			}
		}
		
		public void send(JSONObject payload) {
			try {
				sendMessage(payload);
			}
			catch (IOException error) {
				Log.e(TAG, "send message failed: " + error);
			}
		}
	}
	
	private void connectSession() {
		session = new ApplicationSession(context, selectedDevice);
		ApplicationSession.Listener listener = new ApplicationSession.Listener() {
			@Override
            public void onSessionStarted(ApplicationMetadata appMetadata) {
                ApplicationChannel channel = session.getChannel();
                if (channel == null) {
                    Log.e(TAG, "channel = null");
                    return;
                }
                
                messageStream = new DashMessageStream();
				channel.attachMessageStream(messageStream);
				setAllButtonsEnabled(true);
            }

            @Override
            public void onSessionStartFailed(SessionError error) {
                Log.e(TAG, "onStartFailed " + error);
            }

            @Override
            public void onSessionEnded(SessionError error) {
                Log.i(TAG, "onEnded " + error);
            }
		};

		session.setListener(listener);
		
		try {
            session.startSession(APP_ID);
        } catch (IOException e) {
            Log.e(TAG, "Failed to open session", e);
        }
	}
	
	private void doPlay() {
		JSONObject payload = new JSONObject();
		if (!playbackStarted) {
        	Stream item = (Stream) spinner.getSelectedItem();
        	
        	payload = new JSONObject();
        	try {
        		payload.put("command", "load");
        		payload.put("manifest", item.url);
                payload.put("isLive", false);
        	}
        	catch (JSONException error) {
        		
        	}
        	messageStream.send(payload);
        	playbackStarted = true;
        	playing = true;
        }
        else if (!playing) {
        	payload = new JSONObject();
        	try {
        		payload.put("command", "play");
        	}
        	catch (JSONException error) {
        		
        	}
        	messageStream.send(payload);
        	playing = true;
        }
	}
	
	private void doPause() {
		if (playing) {
        	JSONObject payload = new JSONObject();
        	try {
        		payload.put("command", "pause");
        	}
        	catch (JSONException error) {
        		
        	}
        	messageStream.send(payload);
        	playing = true;
        }
	}
	
	private void doMute() {
		JSONObject payload = new JSONObject();
    	try {
    		payload.put("command", "setMuted");
    		payload.put("muted", true);
    	}
    	catch (JSONException error) {
    		
    	}
    	messageStream.send(payload);
	}
	
	private void doUnmute() {
		JSONObject payload = new JSONObject();
    	try {
    		payload.put("command", "setMuted");
    		payload.put("muted", false);
    	}
    	catch (JSONException error) {
    		
    	}
    	messageStream.send(payload);
	}
	
	private void setAllButtonsEnabled(Boolean enabled) {
		spinner.setEnabled(enabled);
		playPauseToggle.setEnabled(enabled);
		soundToggle.setEnabled(enabled);
		volumeBar.setEnabled(enabled);
		scrubBar.setEnabled(enabled);
	}
	
	private void initButtons() {
		playPauseToggle = (ToggleButton) this.findViewById(R.id.play_pause_toggle);
		playPauseToggle.setOnCheckedChangeListener(
			new CompoundButton.OnCheckedChangeListener() {
			    public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
			        if (isChecked) {
			        	doPlay();
			        } else {
			            doPause();
			        }
			    }
			}
		);
		
		soundToggle = (ToggleButton) this.findViewById(R.id.sound_toggle);
		soundToggle.setOnCheckedChangeListener(
			new CompoundButton.OnCheckedChangeListener() {
			    public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
			        if (isChecked) {
			        	doMute();
			        } else {
			            doUnmute();
			        }
			    }
			}
		);
		
		volumeBar = (SeekBar) this.findViewById(R.id.volume_bar);
		volumeBar.setMax(100);
		volumeBar.setProgress(100);
		volumeBar.setOnSeekBarChangeListener(new OnSeekBarChangeListener() {
			@Override
			public void onStopTrackingTouch(SeekBar seekBar) {
				int percent = seekBar.getProgress();
				double value = (double)percent / 100;
				JSONObject payload = new JSONObject();
		    	try {
		    		payload.put("command", "setVolume");
		    		payload.put("volume", value);
		    	}
		    	catch (JSONException error) {
		    		
		    	}
		    	messageStream.send(payload);
			}
			
			@Override
			public void onStartTrackingTouch(SeekBar seekBar) {
				
			}
			
			@Override
			public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
				
			}
		});
		
		scrubBar = (SeekBar) this.findViewById(R.id.scrub_bar);
		scrubBar.setProgress(0);
		scrubBar.setOnSeekBarChangeListener(new OnSeekBarChangeListener() {
			@Override
			public void onStopTrackingTouch(SeekBar seekBar) {
				int value = seekBar.getProgress();
				JSONObject payload = new JSONObject();
		    	try {
		    		payload.put("command", "seek");
		    		payload.put("time", value);
		    	}
		    	catch (JSONException error) {
		    		
		    	}
		    	messageStream.send(payload);
			}
			
			@Override
			public void onStartTrackingTouch(SeekBar seekBar) {
				
			}
			
			@Override
			public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
				
			}
		});
		
		setAllButtonsEnabled(false);
	}
	
	// MediaRouteAdapter Methods
	
    public void onDeviceAvailable(CastDevice device, String app, MediaRouteStateChangeListener listener) {
		// TODO : What is the string?
    	selectedDevice = device;
		stateListener = listener;
		
		connectSession();
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
		
		populateStreams();
		initButtons();
		initCast();
	}
	
	@Override
    protected void onDestroy() {
        MediaRouteHelper.unregisterMediaRouteProvider(context);
        context.dispose();
        super.onDestroy();
    }
}
