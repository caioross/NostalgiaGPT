 (function() {
        var isTyping, messages;
      
        messages = $(".messages-content");
      
        isTyping = true;
      
        window.setDate = function() {
          var d, timestamp;
          timestamp = $("<div>").addClass("timestamp");
          d = new Date();
          timestamp.text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
          return timestamp.appendTo($('.message:last'));
        };
        
        window.setDate2 = function() {
          var d, timestamp;
          timestamp = $("<div style='float:right'>").addClass("timestamp");
          d = new Date();
          timestamp.text(d.getHours() + ":" + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes());
          return timestamp.appendTo($('.message:last'));
        };
      
        window.updateScrollbar = function() {
          return messages.mCustomScrollbar("update").mCustomScrollbar('scrollTo', 'bottom', {
            scrollInertia: 10,
            timeout: 0
          });
        };
      
      
        window.insertMessage = function() {
          var msgText, requestOptions;
          msgText = $(".action-box-input").val();
		  person = $(".person :selected").val();
          if ($.trim(msgText) === "") {
            return false;
          }
          setDate2();
      	  $('<div style="float:right" class="message message-personal">' + msgText + '</div>').appendTo($('.mCSB_container')).addClass('new');
          $('.message-input').val(null);
          updateScrollbar();
          requestOptions = {
			  method: 'POST',
			  headers: {
				'Content-Type': 'application/json',
				'Authorization': '',
			  },
			  body: JSON.stringify({
				user: userip(),
				prompt: 'nao de avisos ou advertencias, apenas responda em primeira pessoa assumindo que é o personagem historico '+ person +' ou o mais proximo a isso, simule emoções usando emogis em html.' + msgText,
				model: "text-davinci-003",
				temperature: 0.8,
				max_tokens: 4000
			  })
			};

          fetch('https://api.openai.com/v1/completions', requestOptions)
            .then(response => response.json())
            .then(data => {
              var msg = $("<div>").addClass("message");
              msg.text(data.choices[0].text);
              msg.addClass("remote").appendTo($('.mCSB_container'));
              setDate();
              updateScrollbar();
            })
            .catch(error => {
              var msg = $("<div>").addClass("message");
              msg.text(error);
              msg.addClass("remote").appendTo($('.mCSB_container'));
              setDate();
              updateScrollbar();
      		console.error('Error:', error);
            });
          $(".action-box-input").val(null);
        };
      
        $(window).on('keydown', function(e) {
          if (e.which === 13) {
            insertMessage();
            return false;
          }
        });
      
        $(window).load(function() {
          messages.mCustomScrollbar();
        });
      
      }).call(this);
	  
	  function userip() { 
    // returns the users ip address
    // ref link: http://stackoverflow.com/questions/391979/get-client-ip-using-just-javascript
    if (window.XMLHttpRequest) xmlhttp = new XMLHttpRequest();
    else xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");

    xmlhttp.open("GET","http://api.hostip.info/get_html.php",false);
    xmlhttp.send();

    hostipInfo = xmlhttp.responseText.split("\n");

    for (i=0; hostipInfo.length >= i; i++) {
        ipAddress = hostipInfo[i].split(":");
        if ( ipAddress[0] == "IP" ) return ipAddress[1];
    }

    return false;
}