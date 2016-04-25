========= Issue submission guidelines (you may delete the text below after reading it ) =========
Before creating a new issue around a potential bug please:
1. Check your browser's console for 404s (MPD file or media fragments) 
2. Check for Access-Denied errors which indicates an issue with the server's HTTP access control (CORS)
3. Please use the Dash Validator (http://dashif.org/conformance.html) to make sure your MPD and media fragments conform before you file an issue.
4. View the Javascript console to see the debug traces produced by the reference player. They may indicate why your content is not playing.
5. When you do file an issue please add as much info as possible:
* Your dash.js, browser and OS system versions
* Valid MPD test content - ideally the URL to the manifest or a static copy of it if it is not public.
* The relevant excerpt from the console trace showing the problem. 
* A clear sequence of steps to reproduce the problem. 


