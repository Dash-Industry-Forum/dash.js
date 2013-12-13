if(window.location.href.indexOf("runner.html")>0)
{
	 describe("Video Model Extension Suite", function () {
		var element;
		beforeEach(function(){
			element = document.createElement('video');			
		});
		
		it("Check dropped frame count",function(){
			debugger;
			var videoExtensions =  MediaPlayer.dependencies.VideoModelExtensions();
			result = videoExtensions.getDroppedFrames($(element)[0]);
			expect(result).toBe(0);
		});
		
	 });
}