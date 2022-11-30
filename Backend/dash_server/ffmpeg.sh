ffmpeg -re -stream_loop -1 -i TearsOfSteel.mp4 \
    -c:a libopus \
    -vn -f rtp "rtp://3.69.75.114:8002" \
    -filter_complex "drawbox=x=160:y=160:width=460:height=100:color=black@0.5:t=fill,\
    settb=AVTB,setpts='trunc(PTS/1K)*1K+st(1,trunc(RTCTIME/1K))-1K*trunc(ld(1)/1K)',\
   drawtext=text='%{localtime\:%H\\\\\:%M\\\\\:%S}.%{eif\:1M*t-1K*trunc(t*1K)\:d}':x=160:y=160:\
    fontfile=/usr/share/fonts/truetype/freefont/FreeSans.ttf:fontsize=80:fontcolor=white,\
    split=3[s0][s1][s2]; \
    [s0]scale=1280x720[s0]; \
    [s1]scale=960x540[s1]; \
    [s2]scale=1280x720[s2]" \
    -tune zerolatency \
    -c:v libx264 \
    -framerate 25 \
    -map [s2] -an -f rtp "rtp://3.69.75.114:8004" \
    -b:v:0 2000K -maxrate:v:0 2000K -bufsize:v:0 2000K/2 \
    -b:v:1 750K -maxrate:v:1 750K -bufsize:v:1 750K/2 \
    -map [s0] -map [s1] \
    -map 0:a:0 \
    -seg_duration 1 \
    -use_template 1 \
    -use_timeline 1 \
    -window_size 30 \
    -streaming 1 \
    -remove_at_exit 1 \
    -adaptation_sets 'id=0,streams=v id=1,streams=a' \
    -f dash \
   /home/fame/master_project/dash.js/manifest/live.mpd