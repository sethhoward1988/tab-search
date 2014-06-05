
'use strict';

var TabSearch = function () {
	this.KEYBOARD_TIMEOUT = 500,
	this.CHARACTER_COMBINATIONS = [[17,86],[91,86]]
	this.init();
}

TabSearch.prototype = {

	searchEl: 	'<div id="ts-app" class="ts-input-search-container">' +
					'<input class="ts-tab-search-input" type="text" placeholder="Search tabs..."/>' +
					'<div class="ts-results-container"></div>' +
				'</div>',

	resultEl:   '<div class="ts-result-row">' +
					'<div class="ts-title"></div>' +
					'<div class="ts-url"></div>' +
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
			} else if (keyCode == 38){
				this.moveUp();
			} else if (keyCode == 40){
				this.moveDown();
			}
		} else {
			if(keyCode == 17 || keyCode == 91){
				this.keyCodeStack = [];
				this.keyCodeStack.push(keyCode);
				this.listeningNextStroke = true;
				setTimeout(function () {
					that.listeningNextStroke = false;
				}, that.KEYBOARD_TIMEOUT);
			} else if (this.listeningNextStroke){
				this.analyzeStack(keyCode);
			}
		}
	},

	onExtensionResponse: function (resp) {
		this.empty(this.resultsContainer);
		this.resultsIndex = [];
		this.activeIndex = 0;
		for(var i = 0, len = resp.length; i < len; i++){
			this.resultsIndex.push(resp[i]);
			var result = this.createHTML(this.resultEl);
			result.children[0].innerHTML = resp[i].titleHTML;
			result.children[1].innerHTML = resp[i].urlHTML;
			result.indexInResultsIndex = i;
			result.addEventListener('click', this.onResultClick);
			this.resultsContainer.appendChild(result);
			console.log(resp[i]);
		}
		this.moveActive();
	},

	onResultClick: function (evt) {
		this.focus(this.resultsIndex[evt.currentTarget.indexInResultsIndex]);
	},

	onEnter: function (evt) {
		this.focus(this.resultsIndex[this.activeIndex]);
	},

	moveUp: function () {
		if(this.resultsContainer.children.length - 1 < this.activeIndex){
			this.activeIndex++;
			this.moveActive();
		}
	},

	moveDown: function () {
		if(this.activeIndex > 0) {
			this.activeIndex--;
			this.moveActive();
		}
	},

	moveActive: function () {
		for(var i = 0, len = this.resultsContainer.children.length; i < len; i++){
			this.removeClass(this.resultsContainer.children[i], 'active');
		}
		this.addClass(this.resultsContainer.children[this.activeIndex], 'active');
	},

	focus: function (tab) {
		chrome.runtime.sendMessage({
			focus: true,
			tab: tab
		});
		this.destroy();
	},

	onSearchKeyup: function () {
		var that = this;
		
		if(this.searchInput.value == ''){
			this.empty(this.resultsContainer);
		} else {
			if(this.previousSearchValue == this.searchInput.value){
				return;
			} else {
				this.previousSearchValue = this.searchInput.value;
				chrome.runtime.sendMessage({
					string: this.searchInput.value
				}, function (resp) {
					that.onExtensionResponse(resp);
				});	
			}
		}
	},

	destroy: function () {
		this.searchInput.removeEventListener('keyup');
		this.searchHTML.remove();
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
		this.searchHTML = this.createHTML(this.searchEl);
		document.body.appendChild(this.searchHTML);
		this.searchInput = this.searchHTML.children[0];
		this.resultsContainer = this.searchHTML.children[1];
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
		var re = RegExp(el, className);
		if(re.test(el.className)){
			el.className.replace(re, '');
		}
	},

	addClass: function (el, className) {
		var re = RegExp(className, 'gi');
		if(!re.test(el.className)){
			el.className += ' ' + className;
		}
	}
}


console.log('Events running');

window.tabSearch = new TabSearch;

window.addEventListener('keydown', function (evt) {
	// Control 17
	// Command 91
	// v 86
	tabSearch.onWindowKeydown(evt.keyCode);

});
