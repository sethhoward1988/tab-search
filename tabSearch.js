
var TabSearch = function () {
    this.init();
}

TabSearch.prototype = {

    KEYBOARD_TIMEOUT: 500,

    CHARACTERS_BEFORE_SEARCHING: 3,

    searchEl:   '<div id="ts-app" class="ts-input-search-container">' +
                    '<input tabindex="1" class="ts-tab-search-input" type="text" placeholder="Search tabs, bookmarks & chrome links..."/>' +
                    '<div class="ts-results-container"></div>' +
                '</div>',

    resultEl:   '<div class="ts-result-row">' +
                    '<div class="ts-icon"></div>' +
                    '<div class="ts-title"></div>' +
                    '<div class="ts-url"></div>' +
                    '<div class="ts-action ts-button"></div>' +
                '</div>',

    // Initialization

    init: function () {
        this.setBindings();
        this.previousSearchValue = '';
    },

    setBindings: function () {
        this.onWindowKeydown = this.bind(this.onWindowKeydown, this);
        this.onSearchInputKeyup = this.bind(this.onSearchInputKeyup, this);
        this.onSearchInputKeydown = this.bind(this.onSearchInputKeydown, this);
        this.onResultClick = this.bind(this.onResultClick, this);
    },

    // Methods

    moveUp: function () {
        if(this.activeIndex > 0) {
            this.activeIndex--;
            this.placeActiveClassName();
        }
    },

    moveDown: function () {
        if(this.activeIndex < this.resultsContainer.children.length - 1){
            this.activeIndex++;
            this.placeActiveClassName();
        }
    },

    placeActiveClassName: function () {
        var activeElements = this.appEl.getElementsByClassName('active');

        for(var i = 0, len = activeElements.length; i < len; i++){
            this.removeClass(activeElements[i], 'active');
        }
        if(this.resultsContainer.children.length){
            this.addClass(this.resultsContainer.children[this.activeIndex], 'active');    
        }
    },

    selectedAction: function (object) {
        if(object){
            switch(object.type){
                case 'tab':
                    this.focusTab(object);
                    break;
                case 'link':
                    this.openTab(object);
                    break;
                case 'bookmark':
                    this.openTab(object);
                    break;
            }
        } else {
            this.openTab({
                url:'https://www.google.com/search?q=' + this.searchInput.value.split(' ').join('+')
            });
        }
    },

    focusTab: function (tab) {
        chrome.runtime.sendMessage({
            type: 'focus',
            tab: tab
        });
        this.destroy();
    },

    closeTab: function (tab) {
        chrome.runtime.sendMessage({
            type: 'close',
            tab: tab
        });
        tab.destroyEl();
    },

    openTab: function (link) {
        chrome.runtime.sendMessage({
            type: 'open',
            url: link.url
        });
        this.destroy();
    },

    deleteBookmark: function (bookmark) {
        chrome.runtime.sendMessage({
            type: 'delete',
            bookmark: bookmark
        });
        bookmark.destroyEl();
    },

    openSearch: function () {
        if(this.isSearchOpen){
            return;
        }
        this.isSearchOpen = true;
        this.appEl = this.createHTML(this.searchEl);
        document.body.insertAdjacentElement('afterbegin', this.appEl);
        this.searchInput = this.appEl.children[0];
        this.resultsContainer = this.appEl.children[1];
        this.searchInput.addEventListener('keydown', this.onSearchInputKeydown);
        this.searchInput.addEventListener('keyup', this.onSearchInputKeyup);
        this.searchInput.focus();
    },

    destroy: function () {
        this.searchInput.removeEventListener('keydown');
        this.appEl.remove();
        this.isSearchOpen = false;
    },

    actionEvent: function (object) {
        switch(object.type){
            case 'tab':
                this.closeTab(object);
                break;
            case 'bookmark':
                this.deleteBookmark(object);
                break;
        }
    },

    buildResults: function (resp) {
        var that = this;
        this.empty(this.resultsContainer);
        this.resultsIndex = [];
        this.activeIndex = 0;
        if(resp.length){
            this.removeClass(this.searchInput, 'web-search');
            for(var i = 0, len = resp.length; i < len; i++){
                this.resultsIndex.push(resp[i]);
                var result = this.createHTML(this.resultEl);
                result.className += ' ' + resp[i].type;
                result.children[1].innerHTML = resp[i].titleHTML;
                result.children[2].innerHTML = resp[i].urlHTML;

                if(resp[i].type == 'tab'){
                    result.children[3].innerText = "close";
                } else if (resp[i].type == 'bookmark'){
                    result.children[3].innerText = "delete";
                }

                var bindEvents = function(tab, el) {
                    result.children[3].addEventListener('click', function(){
                        that.onActionClick(tab);
                    });
                    result.children[1].addEventListener('click', function(){
                        that.onResultClick(tab);
                    });
                    result.children[2].addEventListener('click', function(){
                        that.onResultClick(tab);
                    });
                    tab.destroyEl = function () {
                        el.remove();
                        that.resultsIndex.splice(that.activeIndex, 1);
                        if(that.activeIndex == that.resultsIndex.length){
                            that.activeIndex--;
                        }
                        that.placeActiveClassName();
                    }
                }(resp[i], result)

                this.resultsContainer.appendChild(result);
            }
        } else {
            this.addClass(this.searchInput, 'web-search');
            console.log('web searching!');
            this.getAutocompletions();
        }
        this.placeActiveClassName();
    },

    getAutocompletions: function () {
        this.jsonp('http://suggestqueries.google.com/complete/search?client=firefox&q=' + this.searchInput.value, function () {
            console.log('my callback fired');
        });
    },

    // Analysis Methods

    analyzeSearchBar: function () {
        var that = this;
        if(this.searchInput.value == ''){
            this.empty(this.resultsContainer);
            this.removeClass(this.searchInput, 'web-search');
            return;
        }

        if(this.previousSearchValue == this.searchInput.value){
            return;
        } 

        this.previousSearchValue = this.searchInput.value;

        if(this.searchInput.value.length < this.CHARACTERS_BEFORE_SEARCHING){
            return;
        }

        chrome.runtime.sendMessage({
            type:'search',
            string: this.searchInput.value
        }, function (resp) {
            that.buildResults(resp);
        });
    },


    // Events

    onActionClick: function (object) {
        this.actionEvent(object);
    },

    onEnter: function (evt) {
        this.selectedAction(this.resultsIndex[this.activeIndex]);
    },

    onControlEnter: function (evt) {
        this.selectedAction(null) // Perform a web search
    },

    onResultClick: function (tab) {
        this.selectedAction(tab);
    },

    onSearchInputKeydown: function (evt) {
        switch(evt.keyCode){
            case 17: //Ctrl
                this.isControlDown = true; return;
            case 91: //Cmd
                this.isControlDown = true; return;
            case 8: //Delete
                if(this.isControlDown){
                    var object = this.resultsIndex[this.activeIndex];
                    if(object){
                        this.actionEvent(object);
                        evt.preventDefault();
                    }
                }
                return;
            case 38:
                this.moveUp(); return;
            case 40:
                this.moveDown(); return;
            case 13:
                if(this.isControlDown){
                    this.onControlEnter();
                } else {
                    this.onEnter();    
                }
                return;
        }
    },

    onSearchInputKeyup: function (evt) {
        if(evt.keyCode == 17 || evt.keyCode == 91){
            this.isControlDown = false;
        }

        this.analyzeSearchBar();
    },

    onWindowKeydown: function (keyCode) {
        if(this.isSearchOpen){
            if(keyCode == 27) {
                this.destroy();
            }
        }
    },

    // Utility Methods

    addClass: function (el, className) {
        var re = RegExp(className, 'gi');
        if(!re.test(el.className)){
            el.className += ' ' + className;
        }
    },

    bind: function (fn, ctxt) {
        return function () {
            fn.apply(ctxt, arguments);
        }
    },

    createHTML: function (HTML) {
        var div = document.createElement('div');
        div.innerHTML = HTML;
        return div.children[0];
    },

    empty: function (el) {
        while(el.firstChild){
            el.removeChild(el.firstChild);
        }
    },

    removeClass: function (el, className) {
        var re = RegExp(className, 'gi');
        if(re.test(el.className)){
            el.className = el.className.replace(re, '');
        }
    },

    ajax: function (type, url, callback) {
        var xhr = new XMLHttpRequest();
        url = (new URL(url)).href;
        xhr.open(type, url, true);
        xhr.onreadystatechange = function (resp) {
            console.log(resp);
            callback();
        };
        xhr.send();
    },

    jsonp: function (url, callback){
        var time = new Date;
        var callbackName = "ts" + (++time).toString();
        var that = this;
        var callbackScript = document.createElement
        window[callbackName] = function () {
            var script = document.getElementById(callbackName);
            script.remove();
            callback()
            delete window[callbackName];
        }
        var script = document.createElement('script');
        script.id = callbackName;
        script.src = (new URL(url)).href + '&callback=' + callbackName;
        var otherScript = document.createElement('script');
        script.
        document.body.appendChild(script);
    }
}

window.tabSearch = new TabSearch;

window.addEventListener('keydown', function (evt) {
    tabSearch.onWindowKeydown(evt.keyCode);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    window.tabSearch.openSearch();
});
