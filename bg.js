console.log('Running bg.js');

var RESULT_COUNT_CAP = 6;

var tabs = []

function analyzeWindows () {
	chrome.windows.getAll(function (windows) {
		for(var i = 0, len = windows.length; i < len; i++){
			analyzeWindow(windows[i]);
		}
	});
}

function analyzeWindow (window) {
	chrome.tabs.getAllInWindow(window.id, function (tabs) {
		for(var i = 0, len = tabs.length; i < len; i++) {
			addTab(tabs[i]);
		}
	});
}

function addTab (tab) {
	tabs.push(tab);
}

function focus (tab, sendResponse) {
	chrome.windows.update(tab.windowId, {
		focused: true
	}, function () {
		chrome.tabs.update(tab.id, {
			active: true
		}, function () {
			sendResponse(1);	
		});
	});
}

function isStringInTab (tab, re, string) {
	var titleMatch = re.test(tab.title.toLowerCase()),
		urlMatch = re.test(tab.url.toLowerCase()),
		results = {
			match: titleMatch || urlMatch
		};

	if(results.match){
		results.titleHTML = tab.title.toLowerCase().replace(re,'<b>' + string +'</b>');
		results.urlHTML = tab.url.toLowerCase().replace(re,'<b>' + string +'</b>');
	}

	return results;
}

function analyzeString (string) {
	var response = [],
		re = RegExp(string.toLowerCase());
		resultCount = 0;

	for(var i = 0, len = tabs.length; i < len; i++){
		var resultFromTab = isStringInTab(tabs[i], re, string);
		
		if (resultCount == RESULT_COUNT_CAP){
			return response;
		}

		if(resultFromTab.match){
			for(prop in resultFromTab){
				tabs[i][prop] = resultFromTab[prop];
			}
			response.push(tabs[i]);
			resultCount++;
		}
	}

	return response;
}

analyzeWindows();

chrome.tabs.onCreated.addListener(function (tab) {
	console.log('Tab Created');
	addTab(tab);
});

chrome.tabs.onRemoved.addListener(function (tab) {
	console.log('Tab Closed');
	removeTab(tab);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log("Received Message", request, sender);
	if(request.string){
		var response = analyzeString(request.string);	
		sendResponse(response);
	}
	if(request.focus){
		focus(request.tab, sendResponse);
	}
});