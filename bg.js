
var tabs = [],
    bookmarks = [],
    links = [];
    objects = [tabs, bookmarks, links];

// Functional Methods

function focusTab (tab, sendResponse) {
    chrome.windows.update(tab.windowId, {
        focused: true
    },
     function () {
        chrome.tabs.update(tab.id, {
            active: true
        }, function () {
            if(sendResponse){
                sendResponse(true);    
            }
        });
    });
}

function closeTab (tab, sendResponse) {
    chrome.tabs.remove(tab.id, function () {
        if(sendResponse){
            sendResponse(true);    
        }
    });
}

function openTab (url) {
    chrome.tabs.create({
        url: url,
        active: true
    });
}

function removeTab (tabToRemove) {
    var removalIndex = 0;

    tabs.forEach(function(tab, index){
        if(tab.id == tabToRemove){
            removalIndex = index;     
        }
    });

    tabs.splice(removalIndex, 1);
}

function deleteBookmark (bookmark) {
    chrome.bookmarks.remove(bookmark.id, function () {});
}


// Analysis Methods

function isStringInObject (tab, re, string) {
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
        re = RegExp(string.toLowerCase()),
        result,
        i;

    for(i = 0, len = objects.length; i < len; i++){
        for(j = 0, length = objects[i].length; j < length; j++){
            result = isStringInObject(objects[i][j], re, string);
            if(result.match){
                for(prop in result){
                    objects[i][j][prop] = result[prop];
                }
                response.push(objects[i][j]);
            }
        } 
    }
    
    return response;
}

// Listener for new tab creation
chrome.tabs.onCreated.addListener(function (tab) {
    addTab(tab);
});

// Listener for tab closure
chrome.tabs.onRemoved.addListener(function (tab) {
    removeTab(tab);
});

// Listener for messages from clients
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var response;
    switch(request.type){
        case 'search':
            response = analyzeString(request.string);   
            sendResponse(response);
            break;
        case 'focus':
            focusTab(request.tab, sendResponse);
            break;
        case 'close':
            closeTab(request.tab, sendResponse);
            break;
        case 'open':
            openTab(request.url, sendResponse);
            break;
        case 'delete':
            deleteBookmark(request.bookmark, sendResponse);
            break;
    }

});

// Listen for Chrome commands
chrome.commands.onCommand.addListener(function(command) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        focusTab(tabs[0]);
        chrome.tabs.sendMessage(tabs[0].id, {
            greeting: "hello"
        }, function() {});
    });
});


// Analyze any windows that were already open

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
    tab.type = "tab";
    tabs.push(tab);
}

analyzeWindows();


// Setup Bookmark Information
chrome.bookmarks.getTree(function (nodes) {
    recurseBookmarkTree(nodes)
});

function recurseBookmarkTree (nodes) {
    Array.prototype.forEach.call(nodes, function (node) {
        if(node.children){
            recurseBookmarkTree(node.children);
        } else {
            node.type = "bookmark";
            bookmarks.push(node);
        }
    });
}


// Setup Chrome Link Information

// Extra Data
var CHROME_INTERNALS = [
    {"type":"link", "title":"Chrome Accessibility","url":"chrome://accessibility/"},
    {"type":"link", "title":"Chrome Appcache Internals","url":"chrome://appcache-internals/"},
    {"type":"link", "title":"Chrome Apps","url":"chrome://apps/"},
    {"type":"link", "title":"Chrome Blob Internals","url":"chrome://blob-internals/"},
    {"type":"link", "title":"Chrome Bookmarks","url":"chrome://bookmarks/"},
    {"type":"link", "title":"Chrome Cache","url":"chrome://cache/"},
    {"type":"link", "title":"Chrome","url":"chrome://chrome/"},
    {"type":"link", "title":"Chrome URLs","url":"chrome://chrome-urls/"},
    {"type":"link", "title":"Chrome Components","url":"chrome://components/"},
    {"type":"link", "title":"Chrome Crashes","url":"chrome://crashes/"},
    {"type":"link", "title":"Chrome Credits","url":"chrome://credits/"},
    {"type":"link", "title":"Chrome Devices","url":"chrome://devices/"},
    {"type":"link", "title":"Chrome DNS","url":"chrome://dns/"},
    {"type":"link", "title":"Chrome Downloads","url":"chrome://downloads/"},
    {"type":"link", "title":"Chrome Extensions","url":"chrome://extensions/"},
    {"type":"link", "title":"Chrome Flags","url":"chrome://flags/"},
    {"type":"link", "title":"Chrome Flash","url":"chrome://flash/"},
    {"type":"link", "title":"Chrome GCM internals","url":"chrome://gcm-internals/"},
    {"type":"link", "title":"Chrome GPU","url":"chrome://gpu/"},
    {"type":"link", "title":"Chrome Help","url":"chrome://help/"},
    {"type":"link", "title":"Chrome Histograms","url":"chrome://histograms/"},
    {"type":"link", "title":"Chrome History","url":"chrome://history/"},
    {"type":"link", "title":"Chrome Indexed DB internals","url":"chrome://indexeddb-internals/"},
    {"type":"link", "title":"Chrome Inspect","url":"chrome://inspect/"},
    {"type":"link", "title":"Chrome Invalidations","url":"chrome://invalidations/"},
    {"type":"link", "title":"Chrome IPC","url":"chrome://ipc/"},
    {"type":"link", "title":"Chrome Media Internals","url":"chrome://media-internals/"},
    {"type":"link", "title":"Chrome Memory","url":"chrome://memory/"},
    {"type":"link", "title":"Chrome Memory Internals","url":"chrome://memory-internals/"},
    {"type":"link", "title":"Chrome NACL","url":"chrome://nacl/"},
    {"type":"link", "title":"Chrome Net Internals","url":"chrome://net-internals/"},
    {"type":"link", "title":"Chrome Newtab","url":"chrome://newtab/"},
    {"type":"link", "title":"Chrome Omnibox","url":"chrome://omnibox/"},
    {"type":"link", "title":"Chrome Plugins","url":"chrome://plugins/"},
    {"type":"link", "title":"Chrome Policy","url":"chrome://policy/"},
    {"type":"link", "title":"Chrome Predictors","url":"chrome://predictors/"},
    {"type":"link", "title":"Chrome Print","url":"chrome://print/"},
    {"type":"link", "title":"Chrome Profiler","url":"chrome://profiler/"},
    {"type":"link", "title":"Chrome Quota Internals","url":"chrome://quota-internals/"},
    {"type":"link", "title":"Chrome Serviceworker internals","url":"chrome://serviceworker-internals/"},
    {"type":"link", "title":"Chrome Settings","url":"chrome://settings/"},
    {"type":"link", "title":"Chrome Signin Internals","url":"chrome://signin-internals/"},
    {"type":"link", "title":"Chrome Stats","url":"chrome://stats/"},
    {"type":"link", "title":"Chrome Sync Internals","url":"chrome://sync-internals/"},
    {"type":"link", "title":"Chrome System","url":"chrome://system/"},
    {"type":"link", "title":"Chrome Terms","url":"chrome://terms/"},
    {"type":"link", "title":"Chrome Tracing","url":"chrome://tracing/"},
    {"type":"link", "title":"Chrome Translate Internals","url":"chrome://translate-internals/"},
    {"type":"link", "title":"Chrome User Actions","url":"chrome://user-actions/"},
    {"type":"link", "title":"Chrome Version","url":"chrome://version/"},
    {"type":"link", "title":"Chrome View HTTP Cache","url":"chrome://view-http-cache/"},
    {"type":"link", "title":"Chrome Webrtc Internals","url":"chrome://webrtc-internals/"},
    {"type":"link", "title":"Chrome Webrtc Logs","url":"chrome://webrtc-logs/"}
];

CHROME_INTERNALS.forEach(function(obj){
    links.push(obj);
});