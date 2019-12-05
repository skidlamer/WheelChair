
let interval_ui = setInterval(() => {
	if (document.getElementById("menuItemContainer") !== null) {
		clearInterval(interval_ui);
		const dev =  chrome.runtime.getURL('wheelchair.js');
		const url = confirm('[ OK ] - Load Skid?\n[ Cancel ] - Load WheelChair') 
		? 'https://raw.githubusercontent.com/skidlamer/WheelChair/master/skid.min.js' 
		: 'https://raw.githubusercontent.com/hrt/WheelChair/master/wheelchair.min.js';
		fetch(  url ) 	
		.then(response => response.text())  
		.then(text => {
			let frame = document.createElement('iframe');
			frame.setAttribute('style', 'display:none');
			document.documentElement.appendChild(frame);
			let child = frame.contentDocument || frame.contentWindow.document;
			let chair = document.createElement('script');
			chair.innerHTML = text.toString().replace(/ttap#4547/g, Math.random().toString(36).substring(2, 15));;
			child.documentElement.append(chair);
			child.documentElement.remove(chair);
			document.documentElement.removeChild(frame);
		});
	}
}, 100);