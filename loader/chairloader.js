/*
 * much nicer injection than what extensions like tampermonkey offer us
 * great against stack traces (VM:XX rather than ..extension/script.js or userscript..)
 * sandboxed environment (unmodified native functions)
 * faster than tamper monkeys "document_start"
 * injects into all frames with high priority
*/

try {
	(ttap)(hrt);
} catch(e) {
	try {
		let recursing = e.stack.match(/chairloader/g).length > 1;
		if (!recursing) {
			// must be synchronous to force execution before other scripts
			// note: we fetch the same code for each iframe
			const request = async () => {
				const url1 = 'https://raw.githubusercontent.com/hrt/WheelChair/master/wheelchair.min.js';
				const url2 = 'https://raw.githubusercontent.com/skidLamer/WheelChair/master/loader/wheelchair.js';
        const url3 = chrome.runtime.getURL('wheelchair.js');
				const response = await fetch(url3);
				const unique_string = chrome.runtime.getURL('').match(/\/\/(\w{9})\w+\//)[1];
				const text = await response.text();
				code = text.toString().replace(/ttap#4547/g, unique_string);
				// inject our code into a new iframe to avoid using hooks placed by anti cheat
				let frame = document.createElement('iframe');
				frame.setAttribute('style', 'display:none');
				document.documentElement.appendChild(frame);
				let child = frame.contentDocument || frame.contentWindow.document;
				let chair = document.createElement('script');
				chair.innerHTML = code;
				child.documentElement.append(chair);
				child.documentElement.remove(chair);
				document.documentElement.removeChild(frame);
			};  request();
		}
	} catch (e) {
		if (e instanceof DOMException) {
			// expected for sandboxed iframes
			console.warn(e);
		} else {
			throw e;
		}
	}
}