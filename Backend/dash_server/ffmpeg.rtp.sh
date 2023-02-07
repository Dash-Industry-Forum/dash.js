ffmpeg -re -fflags +genpts -stream_loop -1 -i TearsOfSteel.mp4 \
    -c:a libopus \
    -vn -f rtp "rtp://127.0.0.1:8002" \
    -filter_complex "drawbox=x=160:y=160:width=460:height=100:color=black@0.5:t=fill,\
    settb=AVTB,setpts='trunc(PTS/1K)*1K+st(1,trunc(RTCTIME/1K))-1K*trunc(ld(1)/1K)',\
   drawtext=text='%{localtime\:%H\\\\\:%M\\\\\:%S}.%{eif\:1M*t-1K*trunc(t*1K)\:d}':x=160:y=160:\
    fontfile=/usr/share/fonts/truetype/freefont/FreeSans.ttf:fontsize=80:fontcolor=white,\
    split=1[s3]; \
    [s3]scale=1280x720[s3]" \
    -c:v h264 \
    -preset ultrafast \
    -framerate 25 \
    -map [s3] -an -f rtp "rtp://127.0.0.1:8004"