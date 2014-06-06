
'use strict';

var TabSearch = function () {
	this.KEYBOARD_TIMEOUT = 500;
    this.CHARACTERS_BEFORE_SEARCHING = 3;
	this.CHARACTER_COMBINATIONS = [[17,86],[91,86]];
	this.init();
}

TabSearch.prototype = {

	searchEl: 	'<div id="ts-app" class="ts-input-search-container">' +
					'<input class="ts-tab-search-input" type="text" placeholder="Search tabs, bookmarks & chrome links"/>' +
					'<div class="ts-results-container"></div>' +
				'</div>',

	resultEl:   '<div class="ts-result-row">' +
                    '<div class="ts-icon"></div>' +
					'<div class="ts-title"></div>' +
					'<div class="ts-url"></div>' +
                    '<div class="ts-action"></div>' +
				'</div>',

	init: function () {
		this.setBindings();
		this.previousSearchValue = '';
	},

	setBindings: function () {
		this.onWindowKeydown = this.bind(this.onWindowKeydown, this);
		this.onSearchKeyup = this.bind(this.onSearchKeyup, this);
		this.onResultClick = this.bind(this.onResultClick, this);
	},

	onWindowKeydown: function (keyCode) {
		var that = this;
		if(this.isSearchOpen){
			if(keyCode == 27) {
				this.destroy();
            }
		}
	},

	onExtensionResponse: function (resp) {
        var that = this;
		this.empty(this.resultsContainer);
		this.resultsIndex = [];
		this.activeIndex = 0;
		for(var i = 0, len = resp.length; i < len; i++){
			this.resultsIndex.push(resp[i]);
			var result = this.createHTML(this.resultEl);
            result.className += ' ' + resp[i].type;
			result.children[1].innerHTML = resp[i].titleHTML;
			result.children[2].innerHTML = resp[i].urlHTML;

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
                }
            }(resp[i], result)

			this.resultsContainer.appendChild(result);
		}
		this.placeActiveClassName();
	},

    onActionClick: function (object) {
        switch(object.type){
            case 'tab':
                this.closeTab(object);
                break;
            case 'bookmark':
                this.deleteBookmark(object);
                break;
        }
    },

    onCloseClick: function (tab) {
        this.closeTab(tab);
    },

	onResultClick: function (tab) {
        this.selectedAction(tab);
	},

	onEnter: function (evt) {
        this.selectedAction(this.resultsIndex[this.activeIndex]);
	},

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

		this.addClass(this.resultsContainer.children[this.activeIndex], 'active');

	},

    selectedAction: function (object) {
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

	onSearchKeyup: function (evt) {
		var that = this;

        switch(evt.keyCode){
            case 38:
                this.moveUp(); return;
            case 40:
                this.moveDown(); return;
            case 13:
                this.onEnter(); return;
        }

		if(this.searchInput.value == ''){
			this.empty(this.resultsContainer);
		} else {
			if(this.previousSearchValue == this.searchInput.value){
				return;
			} else {
                this.previousSearchValue = this.searchInput.value;
                if(this.searchInput.value.length >= this.CHARACTERS_BEFORE_SEARCHING){
                    this.previousSearchValue = this.searchInput.value;
                    chrome.runtime.sendMessage({
                        type:'search',
                        string: this.searchInput.value
                    }, function (resp) {
                        that.onExtensionResponse(resp);
                    });
                }
			}
	    }
	},

	destroy: function () {
		this.searchInput.removeEventListener('keyup');
		this.appEl.remove();
		this.isSearchOpen = false;
	},

	analyzeStack: function (keyCode) {
		if(keyCode == 66){
			this.openSearch();
		}
		this.listeningNextStroke = false;
	},

	openSearch: function () {
		this.isSearchOpen = true;
		this.appEl = this.createHTML(this.searchEl);
		document.body.appendChild(this.appEl);
		this.searchInput = this.appEl.children[0];
		this.resultsContainer = this.appEl.children[1];
		this.searchInput.addEventListener('keyup', this.onSearchKeyup);
		this.searchInput.focus();
	},

	createHTML: function (HTML) {
		var div = document.createElement('div');
		div.innerHTML = HTML;
		return div.children[0];
	},

	bind: function (fn, ctxt) {
		return function () {
			fn.apply(ctxt, arguments);
		}
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

	addClass: function (el, className) {
		var re = RegExp(className, 'gi');
		if(!re.test(el.className)){
			el.className += ' ' + className;
		}
	}
}

window.tabSearch = new TabSearch;

window.addEventListener('keydown', function (evt) {
	tabSearch.onWindowKeydown(evt.keyCode);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	window.tabSearch.openSearch();
});
