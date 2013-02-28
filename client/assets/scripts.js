// PodComms base namespace
var PodComms = (function (parent, $, win) {
    var my = parent = parent || {};
    var UNDEFINED;

    // Socket object
	var socket,

	// Stored user name etc from login event
		userdata,

	// remembers last typed text
		inputBuffer = [],
		inputBufferIndex = 0,

	// For page title blinking
		titleBlinkInterval,
		defaultPageTitle = "PodComms",
		titleBlinkText = "",

	// For reconnects
		testConnectionInterval,

	// Remembers if page is focused or not
		windowFocus = true,

	// jQuery cache
		$chatInput,
		$chatcontainer,
		$chatlog;


	function submitChat() {
		var msg = $chatInput.html();

		msg = msg.replace('&nbsp;', ' '); // This causes issues from copy/pasting

		// Add message to buffer if not already there
		if (inputBuffer.length == 0 || msg != inputBuffer[inputBuffer.length-1]){
			inputBuffer.push( msg );
		}
		inputBufferIndex = inputBuffer.length-1;

		var imgRegex = /<img.*?src=[\'\"](.*?)[\'\"].*?>/ig;
		msg = msg.replace(imgRegex, "$1:data");

		socket.emit('sendChat', msg);
		$chatInput.html('');
	}

	// generic
	function updateUserList(data) {
		for (var i=0; i<data.length; i++) {
			var o = data[i];
			$('.userlist').append('<li><span class="label" style="background: ' + o.colour + '">' + o.name + '</span></li>');
		}
	}

	function setUserName(data) {
		$('#username').html('<span class="label" style="background:' + data.colour + '">' + data.name + '</span>')
	}

	// Title blink
	function titleBlink (text) {
		titleBlinkText = text;

		if (!windowFocus) {
			document.title = titleBlinkText;
			clearInterval(titleBlinkInterval);
			titleBlinkInterval = setInterval(function(){
				document.title = (!windowFocus && document.title == defaultPageTitle ? titleBlinkText : defaultPageTitle);
			}, 1000);
		}
	}

	function purgeChatLog () {
		$chatlog.html('');
	}

	function addMessage (data) {
		var $div = $('<div class="row-fluid"></div>');
		var date = new Date(data.datestamp);
		var datestr = date.getHours() + ":" + date.getMinutes() + "." + date.getSeconds();
		$div.append('<div class="span1 meta"><span class="label" style="background:' + data.colour +'">' + data.username + '</span><span class="datestamp">' + datestr + '</span></div>');
		$div.append('<div class="span11 text well">' + data.message + '</div>');

		$div.find('img').wrap('<div class="imgWrap">').addClass('img-polaroid').each(function() {
			$(this).bind('load', function(){
				scrollToBottom();
			});
		});

		var atBottom = ($chatcontainer[0].scrollTop + $chatcontainer[0].offsetHeight) >= $chatlog[0].offsetHeight;
		
		$chatlog.append($div);

		$div.find('div.map').wrap('<div class="imgWrap">').each(function() {
			var search = $(this).text();
			Map.new( $(this)[0], search );
		});

		if(atBottom) scrollToBottom();
	}

	function scrollToBottom() {
		$chatcontainer.stop().animate({scrollTop:$chatlog.outerHeight()}, 500);
	}

	var signedIn = false;
	function signin () {
		clearInterval(titleBlinkInterval);
		if (!signedIn) {
			testConnectionInterval = setInterval(testConnection, 5000);
			$('#signin').addClass('disabled');
			socket.emit('sendSignIn', $('#signin-name').val());
		}
	}
	function reconnect (user) {
		signedIn = false;
		signin();
	}
	function testConnection() {
		var response = socket.emit('testConnection', userdata);
		if( !response.socket.connected ) {
			console.log( 'Lost connection, should auto-reconnect annnnnnny second' );
		}
	}
	function initSocket () {
		socket = io.connect('/chat');
		socket.on('updateSignedIn', function(data) {
			signedIn = true;
			userdata = data;
			setUserName(userdata);
			
			$('.welcome').fadeOut(100);
			$('.chat').fadeIn(200);
			$chatInput.focus();
		});

		socket.on('updateUserList', function(data) {
			$('.userlist').empty();
			updateUserList(data);
		});

		socket.on('updateChatHistory', function(data) {
			purgeChatLog();
			for (var i = 0; i < data.length; i++) {
				addMessage( data[i] );
			}
			scrollToBottom();
		});

		socket.on('updateChat', function(data) {
			addMessage (data);
			titleBlink(data.username + ' said something...');
		});
	}

    $(function ($) {

    	$("#signin-name").focus();

    	$chatInput = $('#chatinput');
		$chatcontainer = $('#chatcontainer');
		$chatlog = $('.chatlog');

		// ***************************************************
		// SOCKET EVENTS
		// ***************************************************
		initSocket();

		// ***************************************************
		// PAGE EVENTS
		// ***************************************************
		$(window).focus(function(){
			windowFocus = true;
			clearInterval(titleBlinkInterval);
			document.title = defaultPageTitle;
		}).blur(function(){
			windowFocus = false;
		});

		$(document).keydown(function(e){
			// Ctrl + Space
			if (e.ctrlKey && e.keyCode == 32) {
				$chatlog.toggleClass('businessMode');
				e.preventDefault();
			}
			// else if words, focus the text box
			if ( document.activeElement !== $chatInput[0] && !e.ctrlKey && !e.altKey && String.fromCharCode(e.keyCode).match(/[\w\\\/]/) ) {
				$chatInput.focus();
			}
		});

		$('#signin').click(function(e) {
			signin();
		});

		$('#signin-name').keypress(function(e) {
			if (e.keyCode == 13) {
				signin();
			}
		});

		$('#submitButton').click(function(e) {
			submitChat();
		})

		$chatInput.keypress(function(e) {
			if (!e.shiftKey && e.keyCode == 13) {
				e.preventDefault();
				submitChat();
			}
		}).keydown(function(e) {
			if (e.keyCode == 38) {
				// Up
				if (inputBuffer.length > 0) {
					var text = inputBuffer[inputBufferIndex]
					$chatInput.html(text);
					inputBufferIndex = (--inputBufferIndex < 0) ? inputBuffer.length - 1 : inputBufferIndex;
				}
			} else if (e.keyCode == 40) {
				// Down
				if (inputBuffer.length > 0) {
					var text = inputBuffer[inputBufferIndex]
					$chatInput.html(text);
					inputBufferIndex = (inputBufferIndex + 1) % inputBuffer.length;
				}
			}
		}).bind('paste', function(e) {
			// From http://jsfiddle.net/pimvdb/zTAuR/2/
		    var data = e.originalEvent.clipboardData.items[0].getAsFile();
		    var elem = this;
		    var fr = new FileReader;
		    
		    fr.onloadend = function() {
		        var img = new Image;
		        img.onload = function() {
		            insertImageAtCursor(img);
		        };
		        img.src = fr.result;
		    };
		    
		    fr.readAsDataURL(data);
		});
    });

    return parent;
} (PodComms || {}, jQuery, window));



// From StackOverflow
// http://stackoverflow.com/questions/1181700/set-cursor-position-on-contenteditable-div
var savedRange, isInFocus;
function saveSelection()
{
    if(window.getSelection)//non IE Browsers
    {
        savedRange = window.getSelection().getRangeAt(0);
    }
    else if(document.selection)//IE
    { 
        savedRange = document.selection.createRange();  
    } 
}

function restoreSelection()
{
    isInFocus = true;
    document.getElementById("chatinput").focus();
    if (savedRange != null) {
        if (window.getSelection)//non IE and there is already a selection
        {
            var s = window.getSelection();
            if (s.rangeCount > 0) 
                s.removeAllRanges();
            s.addRange(savedRange);
        }
        else 
            if (document.createRange)//non IE and no selection
            {
                window.getSelection().addRange(savedRange);
            }
            else 
                if (document.selection)//IE
                {
                    savedRange.select();
                }
    }
}
//this part onwards is only needed if you want to restore selection onclick
var isInFocus = false;
function onDivBlur()
{
    isInFocus = false;
}

function cancelEvent(e)
{
    if (isInFocus == false && savedRange != null) {
        if (e && e.preventDefault) {
            //alert("FF");
            e.stopPropagation(); // DOM style (return false doesn't always work in FF)
            e.preventDefault();
        }
        else {
            window.event.cancelBubble = true;//IE stopPropagation
        }
        restoreSelection();
        return false; // false = IE style
    }
}

function insertImageAtCursor(img) {
	// http://stackoverflow.com/questions/2920150/insert-text-at-cursor-in-a-content-editable-div
    var sel, range, html;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();

            var id = Math.floor(Math.random()*100000);
            img.id = id;

            range.insertNode( img );

            savedRange.setStartAfter( document.getElementById(id) );
        }
    } else if (document.selection && document.selection.createRange) {
        document.selection.createRange().text = text;
    }
}
















// Map base namespace
var Map = (function (parent) {
    var my = parent = parent || {};

	var melbourne = new google.maps.LatLng(-37.815000, 144.970778);

	my.new = function (elem, search) {

		var map = new google.maps.Map(elem, {
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			disableDefaultUI: true,
			scrollwheel: false,
			zoomControl: true,
			center: melbourne,
			zoom: 17
		});

		var service = new google.maps.places.PlacesService(map);

		var request = {
			location: melbourne,
			radius: '3000',
			keyword : search,
			rankby: 'distance',
			types: ['food']
		};

		service.nearbySearch(request, function (results, status) {
			if (status == google.maps.places.PlacesServiceStatus.OK) {
				var result = results[0];
				var marker = new google.maps.Marker({
					map: map,
					title: result.name,
					animation: google.maps.Animation.DROP,
					position: result.geometry.location
				});
				map.setCenter(result.geometry.location);
			}
		});
	}

    return parent;
} (Map));