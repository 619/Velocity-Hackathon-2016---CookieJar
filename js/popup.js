var url;
var currentTabID;
var isTabIncognito = false;
var cookieList = new Array();
var newCookie = false;
var pasteCookie = false;
var isSeparateWindow = false;
var createAccordionCallback, createAccordionCallbackArguments;
var scrollsave;

$.fx.speeds._default = 200

jQuery(document).ready(function(){
	++data.nPopupClicked;
	start();
});

function start() {
	setLoaderVisible(true);
	
	var arguments = getUrlVars();
	if(arguments.url == undefined) {
		chrome.tabs.getSelected(null, function(tab) {
			url = tab.url;
			currentTabID = tab.id;
			var filter = new Filter();
			filter.setUrl(url);
			createList(filter.getFilter());
			document.title = document.title + "-" + url;
		});
	} else {
		isSeparateWindow = true;
		url = decodeURI(arguments.url);
		currentTabID = parseInt(decodeURI(arguments.id));
		isTabIncognito = decodeURI(arguments.incognito) == "true";
		var filter = new Filter();
		filter.setUrl(url);
		createList(filter.getFilter());
		document.title = document.title + "-" + url;
	}
}

function getDomainUrls() {
  var xhr; 
    if (window.XMLHttpRequest) 
        xhr = new XMLHttpRequest(); 
    else if (window.ActiveXObject) 
        xhr = new ActiveXObject("Msxml2.XMLHTTP");
    else 
        throw new Error("Ajax is not supported by your browser");
    // 1. Instantiate XHR - End
    
    // 2. Handle Response from Server - Start
    xhr.onreadystatechange = function () {
       // if (xhr.readyState < 4)
        //    document.getElementById('div1').innerHTML = "Loading...";
         if (xhr.readyState === 4) {
            if (xhr.status == 200 && xhr.status < 300) 
			{
				try {
					// alert(xhr.responseText);
					var domainArray = $.parseJSON(xhr.responseText);
					if(Object.prototype.toString.apply(domainArray) === "[object Object]")
						domainArray = [domainArray];

					createAccordionList(domainArray, function(){
								swithLayout();
								setEvents();
								$("input:checkbox").uniform();
								//$("input").uniform();
								setLoaderVisible(false);
							});
				} catch(e) {
					alert(e);
					console.error(e.message);
					return;
				}

				//location.reload(true);
				// alert("Saved cookies I think...");
			}
        }
    }
    // 2. Handle Response from Server - End

    // 3. Specify your action, location and Send to the server - Start   
    xhr.open('GET', 'http://www.prontoai.com:8080/get-urls/');
    xhr.send(null);
    // 3. Specify your action, location and Send to the server - End
	//return xhr.responseText;
}

function submit(currentTabID) {
	
	if(newCookie)
		submitNew(currentTabID);
	else if(pasteCookie)
		importCookies();
	else
		submitAll(currentTabID);
}

function submitAll(currentTabID) {
	
	var cookies = $(".cookie", "#cookiesList");
	var nCookiesChangedThisTime = 0;
	cookies.each(function() {
		
		var index = $(".index", 			$(this) ).val();
		
		var name 		=  $(".name", 		$(this) ).val();
		console.log(name);
		var value 		=  $(".value", 		$(this) ).val();
		var domain 		=  $(".domain", 	$(this) ).val();
		var hostOnly 	=  $(".hostOnly",	$(this) ).prop("checked");
		var path 		=  $(".path", 		$(this) ).val();
		var secure 		=  $(".secure", 	$(this) ).prop("checked");
		var httpOnly 	=  $(".httpOnly",	$(this) ).prop("checked");
		var session 	=  $(".session", 	$(this) ).prop("checked");
		var storeId 	=  $(".storeId", 	$(this) ).val();
		 
		var expiration	=  $(".expiration", $(this) ).scroller('getDate');	//$(".expiration",	$(this) ).val();
		var expirationDate = (expiration != null) ? expiration.getTime() / 1000.0 : (new Date().getTime()) / 1000.0;
		
		var newCookie = {};
		newCookie.url = url;
		newCookie.name = name.replace(";", "").replace(",", "");
		value = value.replace(";","");
		newCookie.value = value;
		newCookie.path = path;
		newCookie.storeId = storeId;
		if(!hostOnly)
			newCookie.domain = domain;
		if(!session)
			newCookie.expirationDate = expirationDate;
		newCookie.secure = secure;
		newCookie.httpOnly = httpOnly;
		
		var existingCookie = cookieList[index];
		if(!compareCookies(newCookie,existingCookie)) {
			nCookiesChangedThisTime++;
		}
		
		deleteCookie(newCookie.url, newCookie.name, newCookie.storeId);
		chrome.cookies.set(newCookie);	
	});
	data.nCookiesChanged += nCookiesChangedThisTime;
	
	if(preferences.refreshAfterSubmit) {
		chrome.tabs.reload(currentTabID, {'bypassCache': preferences.skipCacheRefresh});
	}
	
	location.reload(true);
}

function submitNew() {
	var newCookie = $("#newCookie");
	
	var name 		=  $(".name", 		newCookie ).val();
	//alert(name);
	var domain 		=  $(".domain",		newCookie ).val();
	var hostOnly 	=  $(".hostOnly",	newCookie ).prop("checked");
	var value 		=  $(".value", 		newCookie ).val();
	var secure 		=  $(".secure", 	newCookie ).prop("checked");
	var httpOnly 	=  $(".httpOnly",	newCookie ).prop("checked");
	var session 	=  $(".session", 	newCookie ).prop("checked");
	
	var expiration	=  $(".expiration", newCookie).scroller('getDate');
	var expirationDate = (expiration != null) ? expiration.getTime() / 1000.0 : (new Date().getTime()) / 1000.0;
	
	newCookie = {};
	newCookie.url = url;
	newCookie.name = name.replace(";", "").replace(",", "");
	value = value.replace(";","");
	newCookie.value = value;
	newCookie.path = "/"
	if(!hostOnly)
		newCookie.domain = domain;
	if(!session)
		newCookie.expirationDate = expirationDate;
	newCookie.secure = secure;
	newCookie.httpOnly = httpOnly;
	
	deleteCookie(newCookie.url, newCookie.name, newCookie.storeId);
	chrome.cookies.set(newCookie);
	
	++data.nCookiesCreated;
	
	/*if(refreshAfterSubmit) {
		chrome.tabs.reload(currentTabID, {'bypassCache': skipCacheRefresh});
	}*/
	
	location.reload(true);
}

function createList(filters) {
	var filteredCookies = [];
	
	if(filters == null)
		filters = {};
	
	var filterURL = {}
	if(filters.url != undefined)
		filterURL.url = filters.url;
	if(filters.domain != undefined)
		filterURL.domain = filters.domain;
	
	if(!isSeparateWindow) {
		$('#submitDiv').css({
			'bottom': 0
		});
	} else {
		$('#submitDiv').addClass("submitDivSepWindow");
	}

		chrome.cookies.getAll(filterURL, function(cks) {
		var currentC;
		for(var i=0; i<cks.length; i++) {
			currentC = cks[i];
			
			if(filters.name != undefined && currentC.name.toLowerCase().indexOf(filters.name.toLowerCase()) == -1)
				continue;
			if(filters.domain != undefined && currentC.domain.toLowerCase().indexOf(filters.domain.toLowerCase()) == -1)
				continue;
			if(filters.secure != undefined && currentC.secure.toLowerCase().indexOf(filters.secure.toLowerCase()) == -1)
				continue;
			if(filters.session != undefined && currentC.session.toLowerCase().indexOf(filters.session.toLowerCase()) == -1)
				continue;
			
			for(var x=0; x<data.readOnly.length; x++) {
				try {
					var lock = data.readOnly[x];
					if(lock.name == currentC.name && lock.domain == currentC.domain) {
						currentC.isProtected = true;
						break;
					}
				} catch(e){
					console.error(e.message);
					delete data.readOnly[x];
				}
			}
			filteredCookies.push(currentC);
		}
		cookieList = filteredCookies;
		
		if(cookieList.length == 0) {
			swithLayout();
			setEvents();
			setLoaderVisible(false);
			return;
		}
		
		cookieList.sort(function (a, b) {
			if(preferences.sortCookiesType == "domain_alpha") {
				var compDomain = a.domain.toLowerCase().localeCompare(b.domain.toLowerCase());
				if(compDomain)
					return compDomain;
			} 
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
		});
	});

	getDomainUrls();
}

function createAccordionList(cks, callback, callbackArguments) {
	createAccordionCallback = callback;
	createAccordionCallbackArguments = callbackArguments;
	
	try {
		$("#cookiesList").accordion("destroy");
	} catch(e) {
		console.warn(e.message)
	}
	$("#cookiesList").empty();
	// if(cks == null)
		// cks = cookieList;
	// alert(cks);
	for(var i=0; i<cks.length; i++) {
		currentC = cks[i];
		
	 	var domainText = cks[i];
	 	
	 	var titleText;
	 	if(preferences.showDomainBeforeName) {
	 		titleText = $("<p/>").text(domainText).append($("<b/>").text(currentC.name));
	 		if(currentC.isProtected)
	 			$(":first-child", titleText).css("color","green");
	 	} else {
	 		titleText = $("<p/>").append($("<b/>").text(currentC.name)).append($("<span/>").text(domainText));
	 	}
	 	
	 	var titleElement = $("<h3/>").append($("<a/>").html(titleText.html()).attr("href", "#"));
	 	
		var cookie = $(".cookie_details_template").clone().removeClass("cookie_details_template");
		
		// $(".index", cookie).val(i);
		// $(".name", cookie).val(currentC.name);
		// $(".value", cookie).val(currentC.value);
		// $(".domain", cookie).val(currentC.domain);
		// $(".path", cookie).val(currentC.path);
		// $(".storeId", cookie).val(currentC.storeId);
		
		// if(currentC.isProtected)
		// 	$(".unprotected", cookie).hide();
		// else
		// 	$(".protected", cookie).hide();
			
		// if(currentC.hostOnly) {
		// 	$(".domain", cookie).attr("disabled", "disabled");
		// 	$(".hostOnly", cookie).prop("checked", true);
		// }
		// if(currentC.secure) {
		// 	$(".secure", cookie).prop("checked", true);
		// }
		// if(currentC.httpOnly) {
		// 	$(".httpOnly", cookie).prop("checked", true);
		// }
		// if(currentC.session) {
		// 	$(".expiration", cookie).attr("disabled", "disabled");
		// 	$(".session", cookie).prop("checked", true);
		// }
		
		// var now = new Date();
		// var expDate;
		// if(currentC.session) {
		// 	expDate = new Date()
		// 	expDate.setFullYear(expDate.getFullYear() + 1)
		// } else {
		// 	expDate = new Date(currentC.expirationDate * 1000.0);
		// }
		
		
		// $('.expiration', cookie).val(expDate);
		//$('.expiration', cookie).scroller('setDate', expDate, true);
		//Right Here
		$("#cookiesList").append(titleElement);
		$("#cookiesList").append(cookie);
	}
	
	//$('textarea', '#cookiesList').autosize({append: "\n"});
	//$('textarea', '#pasteCookie').autosize({append: "\n"});
	
	document.getElementById("cookiesList").addEventListener("click",function(e) {
	// e.target is our targetted element.
   
	
	    var xhr; 
    if (window.XMLHttpRequest) 
        xhr = new XMLHttpRequest(); 
    else if (window.ActiveXObject) 
        xhr = new ActiveXObject("Msxml2.XMLHTTP");
    else 
        throw new Error("Ajax is not supported by your browser");
    // 1. Instantiate XHR - End
    
    // 2. Handle Response from Server - Start
    xhr.onreadystatechange = function () {
         if (xhr.readyState === 4) 
		 {alert("hey");
            if (xhr.status == 200 && xhr.status < 300) 
			{alert("hey");
				var cookieArray = $.parseJSON(xhr.responseText);
				
				 console.log(e.target.nodeName)
	if(e.target) {
		alert("hiii");
		
		alert(cookieArray[e.target.id.charAt(e.target.id.length - 1)]);
		//window.location='http://' + cookieArray[e.target.id.charAt(e.target.id.length - 1)];
		//url = 'http://' + cookieArray[e.target.id.charAt(e.target.id.length - 1)];
		window.open('http://' + cookieArray[e.target.id.charAt(e.target.id.length - 1)]);
		//GetData();
		
		//window.location.reload();
		//window.location.href = window.location.pathname + window.location.search + window.location.hash;
	//	window.open(cookieArray[e.target.id.charAt(e.target.id.length - 1)].substring(52, cookieArray[e.target.id.charAt(e.target.id.length - 1)].length));
	}
			}
        }
    }
    // 2. Handle Response from Server - End

    // 3. Specify your action, location and Send to the server - Start   
     xhr.open('GET', 'http://www.prontoai.com:8080/get-urls/');
    xhr.send(null);
	//HERE
});
	$("#cookiesList").accordion({
		autoHeight: false,
		heightStyle: "content",
		collapsible: true,
		
		active: cks.length-1,
		create: function(event, ui) {
			if(createAccordionCallback != undefined)
				createAccordionCallback(createAccordionCallbackArguments);
		}
	}
	);
}

function GetData() {
    // 1. Instantiate XHR - Start 

    var xhr; 
    if (window.XMLHttpRequest) 
        xhr = new XMLHttpRequest(); 
    else if (window.ActiveXObject) 
        xhr = new ActiveXObject("Msxml2.XMLHTTP");
    else 
        throw new Error("Ajax is not supported by your browser");
    // 1. Instantiate XHR - End
    
    // 2. Handle Response from Server - Start
    xhr.onreadystatechange = function () {
       // if (xhr.readyState < 4)
        //    document.getElementById('div1').innerHTML = "Loading...";
         if (xhr.readyState === 4) {
            if (xhr.status == 200 && xhr.status < 300) 
			{
				try {
					 //alert(xhr.responseText);
					var cookieArray = $.parseJSON(xhr.responseText);
					if(Object.prototype.toString.apply(cookieArray) === "[object Object]")
						cookieArray = [cookieArray];
					
					// alert(cookieArray[0]);
					
					for(var i=0; i<cookieArray.length; i++) {
						try {
							var cJSON = cookieArray[i];
							var cookie = cookieForCreationFromFullCookie(cJSON);
							// alert(cookie.value);

							//alert(Cookie(cookie));
							//alert(cookie.toString());
							chrome.cookies.set(cookie);
						} catch(e) {
							alert(e);
							// error.html(error.html() + "<br>" + $('<div/>').text("Cookie number " + i).html() + "<br>" + $('<div/>').text(e.message).html());
							console.error(e.message);
							// error.fadeIn();
							return;
						}
					}
				} catch(e) {
					alert(e);
					// error.html(error.html() + "<br>" + $('<div/>').text(e.message).html());
					console.error(e.message);
					// error.fadeIn();
					return;
				}

				location.reload(true);
				//alert("Saved cookies I think...");
								//window.location.reload();


			}
        }
    }
    // 2. Handle Response from Server - End

    // 3. Specify your action, location and Send to the server - Start   
    xhr.open('GET', 'http://www.prontoai.com:8080/test?domain=' + url);
    xhr.send(null);
    // 3. Specify your action, location and Send to the server - End
	//return xhr.responseText;
}

function importCookies() {
	//alert(GetData());
	//var text = data;
	var text = GetData();
	//alert(text);
	var error = '';//$(".error", "#pasteCookie");
	error.hide();
	error.text("For format reference export cookies in JSON");
	error.html(error.html()+"<br> Also check&nbsp;<a href='http://developer.chrome.com/extensions/cookies.html#type-Cookie' target='_blank'>Developer Chrome Cookie</a><br>Error:");
	return;
}

function GetData1(cookieList, url) {
    // 1. Instantiate XHR - Start 

    var xhr; 
    if (window.XMLHttpRequest) 
        xhr = new XMLHttpRequest(); 
    else if (window.ActiveXObject) 
        xhr = new ActiveXObject("Msxml2.XMLHTTP");
    else 
        throw new Error("Ajax is not supported by your browser");
    // 1. Instantiate XHR - End
    
    // 2. Handle Response from Server - Start
    xhr.onreadystatechange = function () {
         if (xhr.readyState === 4) 
		 {
            if (xhr.status == 200 && xhr.status < 300) 
			{
			}
        }
    }
    // 2. Handle Response from Server - End

    // 3. Specify your action, location and Send to the server - Start   
    xhr.open('POST', 'http://www.prontoai.com:8080/test-upload/');
	// alert(cookiesToString.get(cookieList, url));
    xhr.send(cookiesToString.get(cookieList, url));
    // 3. Specify your action, location and Send to the server - End
	//return xhr.responseText;
}

function setEvents() {
	$("#submitButton:first-child").unbind().click(function(){
		submit(currentTabID);
	});
	if(cookieList.length > 0) {
		$("#submitDiv").show();
	}
	$("#submitFiltersButton").button();
	
	$("#submitFiltersDiv").unbind().click(function() {
		var domainChecked = $(".filterDomain:checked", $(this).parent()).val() != null;
		var domain = $("#filterByDomain", $(this).parent()).text();
		var nameChecked = $(".filterName:checked", $(this).parent()).val() != null;
		var name = $("#filterByName", $(this).parent()).text();
		var valueChecked = $(".filterValue:checked", $(this).parent()).val() != null;
		var value = $("#filterByValue", $(this).parent()).text();
		
		var newRule = {};
		if(domainChecked)
			newRule.domain = domain;
		if(nameChecked)
			newRule.name = name;
		if(valueChecked)
			newRule.value = value;
		
		var nCookiesFlaggedThisTime = 0;
		for(var i=0; i<cookieList.length; i++) {
			var currentCookie = cookieList[i];
			if(currentCookie.isProtected)
				continue;
			
			if(!filterMatchesCookie(newRule,currentCookie.name,currentCookie.domain,currentCookie.value))
					continue;
			
			deleteCookie(url, currentCookie.name, currentCookie.storeId);
			nCookiesFlaggedThisTime++;
			cookieList.splice(i,1);
			i--;
		}
		data.nCookiesFlagged += nCookiesFlaggedThisTime;
		var exists = addBlockRule(newRule);
		//if(exists != undefined && exists >= 0)
			//deleteBlockRule(exists);
		location.reload(true);
		return;
	});
	
	$("#deleteAllButton").unbind().click(function() {
		if(cookieList.length == 0)
			return false;
		var okFunction = function() {
			nCookiesDeletedThisTime = cookieList.length;
			deleteAll(cookieList, url);
			data.nCookiesDeleted += nCookiesDeletedThisTime;
			location.reload(true);
		}
		startAlertDialog(_getMessage("Alert_deleteAll"), okFunction, function(){});
	});
	
	if(preferences.showCommandsLabels) {
		$(".commands-row", ".commands-table").addClass("commands-row-texy");
	}
	
	if(preferences.showFlagAndDeleteAll) {
		$("#flagAllButton").show();
		$("#flagAllButton").unbind().click(function() {
			if(cookieList.length == 0)
				return false;
			var okFunction = function() {
				nCookiesFlaggedThisTime = cookieList.length;
				for(var i=0; i<cookieList.length; i++) {
					var currentCookie = cookieList[i];
					if(currentCookie.isProtected)
						continue;
					var newRule = {};
					newRule.domain = currentCookie.domain;
					newRule.name = currentCookie.name;
					addBlockRule(newRule);
					deleteCookie(url, currentCookie.name, currentCookie.storeId);
				}
				data.nCookiesFlagged += nCookiesFlaggedThisTime;
				location.reload(true);
				return;
			}
			startAlertDialog(_getMessage("flagAll"), okFunction, function(){});
		});
	} else {
		$("#flagAllButton").hide();
	}
	
	//$("#copyButton").attr("title",preferences.copyCookiesType);

	$("#refreshButton").unbind().click(function() {
		location.reload(true);
	});
	
	$("#addCookieButton").unbind().click(function() {
		newCookie = true;
		pasteCookie = false;
		swithLayout("new");
	});
	
	$("#backToList").unbind().click(function() {
		newCookie = false;
		pasteCookie = false;
		swithLayout();
	});
	
	$("#clearNew").unbind().click(function() {
		clearNewCookieData();
	});
	
	$("#optionsButton").unbind().click(function() {
		chrome.tabs.getAllInWindow(null, function tabSearch(tabs) {
			var urlToOpen = chrome.extension.getURL('options_pages/support.html');
			var urlToOpen = chrome.extension.getURL('options_main_page.html');
			for(var i=0; i<tabs.length; i++) {
				var tab = tabs[i];
				if(tab.url.indexOf(urlToOpen) == 0) {
					chrome.tabs.update(tab.id, {
						selected:true
					});
					return;
				}
			}
			chrome.tabs.create({
				url:urlToOpen//+"?page=user_preferences"
			});
		});
	});
	
	// Upload cookies to server
	$("#copyButton").unbind().click(function() {
		GetData1(cookieList, url);
	});
	
	// Download cookies from server
	$("#pasteButton").unbind().click(function() {
		importCookies(data);
	});
	
	$("#searchButton").unbind().click(function() {
		$("#searchField").focus();
		$("#searchField").fadeIn("normal",function(){$("#searchField").focus();});
		$("#searchField").focus();
		window.open('https://www.google.com/');
	});
	
	$("#searchBox").unbind().focusout( function() {
		$("#searchField").fadeOut();
	});
	
	$("#searchField").unbind().keyup(function() {
		find($(this).val());
		
	});
	clearNewCookieData();
	
	$(".toast").each(function(){
		//var pos = $(this).position();
		$(this).css("margin-top", "-" + ( $(this).height()/2 ) + "px" );
		$(this).css("margin-left", "-" + ( $(this).width()/2 ) + "px" );
	});

	$('textarea.value, input.domain, input.path').keydown(function (event) {
	if (event.ctrlKey && event.keyCode == 13) {
		submit(currentTabID);
		console.log('trigger save (submit)');
		event.preventDefault();
		event.stopPropagation();
	}
});

	setCookieEvents();
}

function setCookieEvents() {
	$(".hostOnly").click(function() {
		var cookie = $(this).closest(".cookie");
		var checked = $(this).prop("checked");
		if(!!checked)
			$(".domain", cookie).attr("disabled", "disabled");
		else
			$(".domain", cookie).removeAttr("disabled");
	});
	
	$(".session").click(function() {
		var cookie = $(this).closest(".cookie");
		var checked = $(this).prop("checked");
		if(!!checked)
			$(".expiration", cookie).attr("disabled", "disabled");
		else
			$(".expiration", cookie).removeAttr("disabled");
	});
	
	$(".deleteOne").click(function() {
		var cookie = $(this).closest(".cookie");
		var name 	= $(".name", cookie).val();
		var storeId = $(".storeId", cookie).val();
		var okFunction = function() {
			deleteCookie(url, name, storeId, function(success) {
				if(success === true) {
					var head = cookie.prev('h3');
					cookie.add(head).slideUp(function(){
						$(this).remove();
						swithLayout();
					});
					
				} else {
					location.reload(true);
				}
			});
			++data.nCookiesDeleted;
		}
		startAlertDialog(_getMessage("Alert_deleteCookie") + ": \"" + name + "\"?", okFunction, function(){})
	});
	$(".flagOne").click(function() {
		var cookie = $(this).closest(".cookie");
		var domain 	= $(".domain", 	cookie).val();
		var name 	= $(".name", 	cookie).val();
		var value 	= $(".value", 	cookie).val();
		
		$("#filterByDomain","#cookieFilter").text(domain);
		$("#filterByName","#cookieFilter").text(name);
		$("#filterByValue","#cookieFilter").text(value);
		
		swithLayout("flag");
	});
	
	$(".protectOne").click(function() {
		var cookie = $(this).closest(".cookie");
		var titleName = $("b", cookie.prev()).first();
		var index = $(".index", cookie).val();
		isProtected = switchReadOnlyRule(cookieList[index]);
		
		cookieList[index].isProtected = isProtected;
		if(isProtected) {
			$(".unprotected", cookie).fadeOut('fast',function(){
				$(".protected", cookie).fadeIn('fast');
			});
			titleName.css("color","green");
		} else {
			$(".protected", cookie).fadeOut('fast',function(){
				$(".unprotected", cookie).fadeIn('fast');
			});
			titleName.css("color","#000");
		}
	});
	
	var now = new Date();
	$('.expiration').scroller({
		preset: 'datetime',
		minDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
		maxDate: new Date(2050, now.getMonth(), now.getDate()),
		dateFormat: "dd/mm/yy",
		timeFormat: "hh:ii A",
		theme: 'android-ics light',
		display: 'modal',
		mode: 'clickpick'
	});
	$('.expiration').each(function(){
		$(this).scroller('setDate', new Date($(this).val()), true);
	});
	$('#show').click(function(){
		var cookie = $(this).closest(".cookie");
		scrollsave = $('body').scrollTop();
		$("html").scrollTop(0);
		$('.expiration', cookie).scroller('show'); 
		return false;
	});
	$('#clear').click(function () {
		var cookie = $(this).closest(".cookie");
		$('.expiration', cookie).val('');
		$('body').scrollTop(scrollsave);
		return false;
	});
	
	$(".domain",$("#newCookie")).val(getHost(url));
}

function startAlertDialog(title, ok_callback, cancel_callback) {
	if(ok_callback != undefined) {
		if(!preferences.showAlerts) {
			ok_callback();
			return;
		}
		$("#alert_ok").unbind().click(function() {
			$("#alert_wrapper").hide();
			ok_callback();
		});
	} else {
		return;
	}
	
	if(cancel_callback != undefined) {
		$("#alert_cancel").show();
		$("#alert_cancel").unbind().click(function() {
			$("#alert_wrapper").hide('fade');
			cancel_callback();
		});
	} else {
		$("#alert_cancel").hide();
	}
	$("#alert_title_p").empty().text(title);
	$("#alert_wrapper").show('fade');
}

function clearNewCookieData() {
	var myDate = new Date();
	myDate.setFullYear(myDate.getFullYear() + 1)
	
	$(".expiration","#newCookie").attr("value",myDate);
}

var lastInput = "";
function find(pattern) {
	if(pattern == lastInput)
		return;
	lastInput = pattern;
	var shiftsMade = 0;
	$($(".cookie", "#cookiesList").get().reverse()).each(function(){
		var name = $(".name", $(this)).val();
		var node = $(this);
		var h3 = $(this).prev();
		if(pattern != "" && name.toLowerCase().indexOf(pattern.toLowerCase()) != -1) {
			h3.addClass("searchResult");
			node.detach();
			h3.detach();
			$("#cookiesList").prepend(node);
			$("#cookiesList").prepend(h3);
		} else {
			h3.removeClass("searchResult");
		}
	});
	$("#cookiesList").accordion( "option" , "collapsible" , "true");
	$("#cookiesList").accordion( "option" , "inactive" , cookieList.length );
}

/*
function resizeCommandsFontSize() {				//http://stackoverflow.com/questions/4165836/javascript-scale-text-to-fit-in-fixed-div
	var largestCommandWidth = 0;
	var size = 0;
	var maxWidth = parseInt($('body').width(), 10)+1;
	var maxHeight = 0;
	var resizer = null;
	
	$('.commands-table').each(function(){
		if(resizer==null || $(this).width()>largestCommandWidth) {
			largestCommandWidth = $(this).width();
			resizer = $(this);
		}
	});
	maxHeight = $(resizer).height();
	resizer = $(resizer).clone();
	$(resizer).attr('id','hidden-commands-resizer').hide().appendTo(document.body);
	
	size = parseInt(resizer.css("font-size"), 10);
	while(resizer.width()<maxWidth && resizer.height()<=maxHeight && size<15) {
		resizer.css("font-size", ++size);
	}
	if( resizer.height()>maxHeight )
		--size;
	$(".commands-table").css("font-size", size);
	$(resizer).detach()
}
*/

/*
	LAYOUTS = [
		"default",
		"list",
		"empty",
		"flag",
		"paste",
		"new"
	]
*/
var lastLayout = "none";
function swithLayout(newLayout) {
	if(newLayout == undefined) {
		newLayout = "default";
	}
	if(lastLayout == newLayout)
		return;
	if(newLayout != "default")
		lastLayout = newLayout;
	
	if(newLayout == "default") {
		$("#newCookie").slideUp();
		$("#pasteCookie").slideUp();
		$("#cookieFilter").slideUp();
		$("#submitFiltersButton").slideUp();
		
		if($("h3", "#cookiesList").length) {
			swithLayout("list");
		} else {
			swithLayout("empty");
		}
	} else if(newLayout == "list") {
		$(".commands-table").first().animate({opacity: 0}, function() {
			$("#deleteAllButton").show();
			if(preferences.showFlagAndDeleteAll)
				$("#flagAllButton").show();
			$("#addCookieButton").show();
			$("#backToList").hide();
			$("#copyButton").show();
			$("#pasteButton").show();
			$("#searchButton").show();
			$(".commands-table").first().animate({opacity: 1});
		});
		$("#noCookies").slideUp();
		//$("#cookiesList").slideDown();
		$("#submitDiv").show();
	} else if(newLayout == "empty") {
		$(".commands-table").first().animate({opacity: 0}, function() {
			$("#deleteAllButton").hide();
			$("#flagAllButton").hide();
			$("#addCookieButton").show();
			$("#backToList").hide();
			$("#copyButton").hide();
			$("#pasteButton").show();
			$("#searchButton").hide();
			$(".commands-table").first().animate({opacity: 1});
		});
		$(".notOnEmpty").hide();
		$("#noCookies").slideDown();
		//$("#cookiesList").slideUp();
		$("#submitDiv").hide();
	} else {
		$(".commands-table").first().animate({opacity: 0}, function() {
			$("#deleteAllButton").hide();
			$("#flagAllButton").hide();
			$("#addCookieButton").hide();
			$("#backToList").show();
			$("#copyButton").hide();
			$("#pasteButton").hide();
			$("#searchButton").hide();
			$(".commands-table").first().animate({opacity: 1});
		});
		$("#noCookies").slideUp();
		//$("#cookiesList").slideUp();
		if(newLayout == "flag") {
			$("#newCookie").slideUp();
			$("#pasteCookie").slideUp();
			$("#cookieFilter").slideDown();
			$("#submitFiltersButton").slideDown();
			$("#submitDiv").hide();
		} else if(newLayout == "paste") {
			$("#newCookie").slideUp();
			$("#pasteCookie").slideDown();
			$("#cookieFilter").slideUp();
			$("#submitFiltersButton").slideUp();
			$("#submitDiv").show();
			$(".value", "#new").focus();
		} else if(newLayout == "new") {
			$("#newCookie").slideDown();
			$("#pasteCookie").slideUp();
			$("#cookieFilter").slideUp();
			$("#submitFiltersButton").slideUp();
			$("#submitDiv").show();
			$('#newCookie input.name').focus();
		}
	}
}
