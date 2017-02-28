var Solitaire = (function(canvasId){
	var canvas = document.getElementById(canvasId);
	canvas.width = $("#frame").width() - 40;
	canvas.height = $("#frame").height() - $(canvas).offset().top;
	var context = canvas.getContext("2d");
	var cards = [];
	var stock;
	var tableaus = [];
	var foundations = [];
	
	var tableauWidth = canvas.width / 7;
	var cardHeight = canvas.height / 3;
	var cardWidth = cardHeight * 0.66667;
	
	function startGame(){
		if(cards.length != 52){
			for(var i=0;i<52;i++){
				cards.push(new Card(i));
			}
		}
		
		shuffle();
				
		tableaus = [];
		for(var i=0;i<7;i++){
			tableaus.push(new Tableau());
		}
		var index = 0;
		for(var j=0;j<7;j++){
			for(var k=j;k<7;k++){
				tableaus[k].addCard(cards[index]);
				index++;
			}
			
			tableaus[j].flipTop();
		}
		
		foundations = [];
		for(var i=0;i<4;i++){
			foundations.push(new Foundation(i));
		}
		
		stock = new Stock();
		for(var k = index;k<cards.length;k++){
			stock.addCard(cards[k]);
		}
		
		draw();
		
		$(canvas).on("mousedown", function(evt){
			var pageX = evt.pageX - $(canvas).offset().left;
			var pageY = evt.pageY - $(canvas).offset().top;
			var activeCard;
			
			var tableau = Math.floor(pageX/tableauWidth);
			if(pageY >= cardHeight + 8){
				activeCard = tableaus[tableau].checkForClick(pageX - (tableauWidth * tableau), pageY - (cardHeight + 8));
				tableaus[tableau].removeCard(activeCard);
			}
			else {
				if(pageX < tableauWidth * 2){
					activeCard = stock.checkClick(pageX);
					draw();
				}
				else {
					if(tableau >= 3){
						activeCard = foundations[tableau-3].getTopCard();
					}
				}
			}
			
			if(activeCard != undefined){
				$(canvas).on("mousemove", function(moveevt){
					var moveX = moveevt.pageX - $(canvas).offset().left;
					var moveY = moveevt.pageY - $(canvas).offset().top;
					
					activeCard.setPosition(moveX, moveY);
					var card = activeCard;
					var index = 1;
					while((card = card.getChild()) != undefined){
						card.setPosition(moveX, moveY + (16 * index));
						index++;
					}
					draw(activeCard);
					
				});
				$(canvas).on("mouseup", function(upEvt){
					$(canvas).off("mousemove");
					$(canvas).off("mouseup");
					var upX = upEvt.pageX - $(canvas).offset().left;
					var upY = upEvt.pageY - $(canvas).offset().top;
					var newTableau = Math.floor(upX/tableauWidth);
					if(upY >= cardHeight + 8){
						if(tableaus[newTableau] != activeCard.getTableau()){
							if(!tableaus[newTableau].moveCardTo(activeCard)){
								if(activeCard.getTableau() != undefined){
									activeCard.getTableau().addCard(activeCard);
								}
								else if(activeCard.getFoundation() != undefined){
									activeCard.getFoundation().addCard(activeCard);
								}
								else {
									stock.replaceActiveCard(activeCard);
								}
							}
						}
						else {
							if(activeCard.getTableau() != undefined){
								activeCard.getTableau().addCard(activeCard);
							}
							else {
								stock.replaceActiveCard(activeCard);
							}
						}
					}
					else {
						if(newTableau >= 3){
							if(!foundations[newTableau - 3].addCard(activeCard)){
								if(activeCard.getTableau() != undefined){
									activeCard.getTableau().addCard(activeCard);
								}
								else if(activeCard.getFoundation() != undefined){
									activeCard.getFoundation().addCard(activeCard);
								}
								else {
									stock.replaceActiveCard(activeCard);
								}
							}
							else {
								var complete = true;
								for(var i=0;i<foundations.length;i++){
									complete = foundations[i].iscomplete();
									if(!complete){
										break;
									}
								}
								
								if(complete){
									Blueprint.utils.Messaging.alert("You win!");
								}
							}
						}
					}
					
					activeCard = undefined;
					draw();
				});
			}
		});
	}
	
	function shuffle(times){
		times = times || 3;
		for(var i=0;i<times;i++){
			cards.sort(function(a,b){
				return Math.floor(Math.random() * 2) - 1;
			});
		}
	}
	
	function draw(activeCard){
		context.clearRect(0, 0, canvas.width, canvas.height);
		stock.draw(cardWidth/2, 0);
		
		for(var i=0;i<tableaus.length;i++){
			tableaus[i].draw(tableauWidth * i, cardHeight + 8);
		}
		
		for(var j=0;j<foundations.length;j++){
			foundations[j].draw();
		}
		
		if(activeCard){
			activeCard.draw(0, 0, true);
			var card = activeCard;
			while((card = card.getChild()) != undefined){
				card.draw(0,0,true);
			}
		}
	}
	
	function drawRect(x, y, width, height, corner){
		corner = corner || 0;
		context.beginPath();
		context.moveTo(x + corner, y);
		context.lineTo(x + width - corner, y);
		context.quadraticCurveTo(x + width, y, x + width, y + corner);
		context.lineTo(x + width, y + height - corner);
		context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
		context.lineTo(x + corner, y + height);
		context.quadraticCurveTo(x, y + height, x, y + height - corner);
		context.lineTo(x, y + corner);
		context.quadraticCurveTo(x, y, x + corner, y);
		context.closePath();
	}
	
	function drawLogo(x, y){
		drawRect(x, y + 4, cardWidth - 16, 12, 4);
		context.fillStyle = "#B0B7BC";
		context.fill();
		
		context.beginPath();
		context.moveTo(x + 12, y + 20);
		context.lineTo(x + cardWidth - 28, y + 32);
		context.lineTo(x + 12, y + 32);
		context.quadraticCurveTo(x + 8, y + 32, x + 8, y + 28);
		context.lineTo(x + 8, y + 24);
		context.quadraticCurveTo(x + 8, y + 20, x + 12, y + 20);
		context.closePath();
		context.fill();
		
		context.beginPath();
		context.moveTo(x + 16, y + 36);
		context.lineTo(x + 32, y + 36);
		context.lineTo(x + 32, y + 80);
		context.quadraticCurveTo(x + 20, y + 72, x + 16, y + 72);
		context.lineTo(x + 16, y + 36);
		context.closePath();
		context.fill();
		
		context.beginPath();
		context.moveTo(x + 36, y + 36);
		context.lineTo(x + 52, y + 36);
		context.lineTo(x + 52, y + 96);
		context.quadraticCurveTo(x + 40, y + 82, x+36, y + 82);
		context.lineTo(x + 36, y + 36);
		context.closePath();
		context.fill();
		
		context.beginPath();
		context.moveTo(x + 56, y + 36);
		context.lineTo(x + 72, y + 36);
		context.lineTo(x + 72, y + 120);
		context.quadraticCurveTo(x + 60, y + 98, x + 56, y + 98);
		context.lineTo(x + 56, y + 36);
		context.closePath();
		context.fill();
	}
	
	function drawFace(suit, value, x, y){
		var fillStyle;
		var drawShape;
		if(suit == 0){
			drawShape = drawHeart;
			fillStyle = "#FF0000";
		}
		else if(suit == 1){
			drawShape = drawClub;
			fillStyle = "#000000";
		}
		else if(suit == 2){
			drawShape = drawDiamond;
			fillStyle = "#FF0000";
		}
		else if(suit == 3){
			drawShape = drawSpade;
			fillStyle = "#000000";
		}
		
		var valueChar;
		if(value == 0){
			valueChar = "A";
		}
		else if(value == 10){
			valueChar = "J";
		}
		else if(value == 11){
			valueChar = "Q";
		}
		else if(value == 12){
			valueChar = "K";
		}
		else {
			valueChar = parseInt(value + 1).toString();
		}
		
		context.font = "16px 'Muli'";
		context.textAlign = "left";
		context.fillStyle = fillStyle;
		context.fillText(valueChar, x + 4, y + 20);
		drawShape(x + 4, y + 24, 12, 12);
		context.fill();
		
		context.translate(x + cardWidth - 4, y + cardHeight - 20);
		context.save();
		context.rotate(Math.PI);
		context.fillText(valueChar, 0, 0);
		drawShape(0, 4, 12, 16);
		context.fill();
		context.restore();
		context.translate((x + cardWidth - 4) * -1, (y + cardHeight - 20) * -1);
		drawShapes(x, y, value, drawShape);
	}
	
	function drawShapes(x, y, value, drawShape){
		value = parseInt(value+1);
		if(value == 1){
			drawShape(x+cardWidth/2 - 24, y + cardHeight/2 - 24, 48,48);
			context.fill();
		}
		if(value == 2){
			drawShape(x+cardWidth/2 - 8,y + 16,16,16);
			context.fill();
			
			context.translate(x + cardWidth/2 + 8, y+cardHeight - 16);
			context.save();
			context.rotate(Math.PI);
			drawShape(0,0,16,16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth/2+8)*-1,(y+cardHeight-16)*-1);
		}
		else if(value == 3){
			drawShape(x+cardWidth/2 - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth/2 - 8, y+cardHeight/2-8, 16,16);
			context.fill();
			
			context.translate(x + cardWidth/2 + 8, y+cardHeight-16);
			context.save();
			context.rotate(Math.PI);
			drawShape(0,0,16,16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth/2+8)*-1,(y+cardHeight-16)*-1);
		}
		else if(value == 4){
			drawShape(x+cardWidth*(3/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+16, 16, 16);
			context.fill();
			
			context.translate(x + cardWidth*(5/8) + 8, y+cardHeight-16);
			context.save();
			context.rotate(Math.PI);
			drawShape(0, 0, 16, 16);
			context.fill();
			drawShape(cardWidth*(1/4),0,16,16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth*(5/8) + 8) * -1, (y+cardHeight-16)*-1);
		}
		else if(value == 5){
			drawShape(x+cardWidth*(3/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth/2 - 8, y+cardHeight/2 - 8, 16, 16);
			context.fill();
			
			context.translate(x + cardWidth*(5/8) + 8, y+cardHeight-16);
			context.save();
			context.rotate(Math.PI);
			drawShape(0, 0, 16, 16);
			context.fill();
			drawShape(cardWidth*(1/4),0,16,16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth*(5/8) + 8) * -1, (y+cardHeight-16)*-1);
		}
		else if(value == 6){
			drawShape(x+cardWidth*(3/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(3/8) - 8, y+cardHeight/2 - 8, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+cardHeight/2 - 8, 16, 16);
			context.fill();
			
			context.translate(x + cardWidth*(5/8) + 8, y+cardHeight-16);
			context.save();
			context.rotate(Math.PI);
			drawShape(0, 0, 16, 16);
			context.fill();
			drawShape(cardWidth*(1/4),0,16,16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth*(5/8) + 8) * -1, (y+cardHeight-16)*-1);
		}
		else if(value == 7){
			drawShape(x+cardWidth*(3/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth/2 - 8, y+cardHeight * (5/16) - 8, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(3/8) - 8, y+cardHeight/2 - 8, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+cardHeight/2 - 8, 16, 16);
			context.fill();
			
			context.translate(x + cardWidth*(5/8) + 8, y+cardHeight-16);
			context.save();
			context.rotate(Math.PI);
			drawShape(0, 0, 16, 16);
			context.fill();
			drawShape(cardWidth*(1/4),0,16,16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth*(5/8) + 8) * -1, (y+cardHeight-16)*-1);
		}
		else if(value == 8){
			drawShape(x+cardWidth*(3/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth/2 - 8, y+cardHeight * (5/16) - 8, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(3/8) - 8, y+cardHeight/2 - 8, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+cardHeight/2 - 8, 16, 16);
			context.fill();
			
			context.translate(x + cardWidth*(5/8) + 8, y+cardHeight-16);
			context.save();
			context.rotate(Math.PI);
			drawShape(0, 0, 16, 16);
			context.fill();
			drawShape(cardWidth*(1/4),0,16,16);
			context.fill();
			drawShape(cardWidth*(1/8),cardHeight*(3/16),16,16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth*(5/8) + 8) * -1, (y+cardHeight-16)*-1);
		}
		else if(value == 9){
			drawShape(x+cardWidth*(3/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth/2 - 8, y+cardHeight/2 - 8, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(3/8) - 8, y+cardHeight*(5/16) - 8, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+cardHeight*(5/16) - 8, 16, 16);
			context.fill();
			
			context.translate(x + cardWidth*(5/8) + 8, y+cardHeight-16);
			context.save();
			context.rotate(Math.PI);
			drawShape(0, 0, 16, 16);
			context.fill();
			drawShape(cardWidth*(1/4),0,16,16);
			context.fill();
			drawShape(0, cardHeight*(3/16), 16, 16);
			context.fill();
			drawShape(cardWidth*(1/4),cardHeight*(3/16), 16, 16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth*(5/8) + 8) * -1, (y+cardHeight-16)*-1);
		}
		else if(value == 10){
			drawShape(x+cardWidth*(3/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+16, 16, 16);
			context.fill();
			drawShape(x+cardWidth/2 - 8, y+cardHeight*(1/4), 16, 16);
			context.fill();
			drawShape(x+cardWidth*(5/8) - 8, y+cardHeight*(3/8), 16, 16);
			context.fill();
			drawShape(x+cardWidth*(3/8) - 8, y+cardHeight*(3/8), 16, 16);
			context.fill();
			
			context.translate(x + cardWidth/2, y+cardHeight);
			context.save();
			context.rotate(Math.PI);
			drawShape(cardWidth*(1/8)-8,16,16,16);
			context.fill();
			drawShape(cardWidth*(-1/8)-8,16,16,16);
			context.fill();
			drawShape(-8,cardHeight*(1/4),16,16);
			context.fill();
			drawShape(cardWidth*(1/8)-8,cardHeight*(3/8),16,16);
			context.fill();
			drawShape(cardWidth*(-1/8)-8,cardHeight*(3/8),16,16);
			context.fill();
			context.restore();
			context.translate((x+cardWidth/2)*-1,(y+cardHeight)*-1);
		}
		else if(value == 11){
			context.font = "48px 'Muli'";
			context.textAlign = "center";
			context.fillText("J", x+cardWidth/2,y+cardHeight/2);
		}
		else if(value == 12){
			context.font = "48px 'Muli'";
			context.textAlign = "center";
			context.fillText("Q", x+cardWidth/2,y+cardHeight/2);
		}
		else if(value == 13){
			context.font = "48px 'Muli'";
			context.textAlign = "center";
			context.fillText("K", x+cardWidth/2,y+cardHeight/2);
		}
	}
	
	function drawHeart(x, y, width, height){
		context.beginPath();
		context.moveTo(x + width/2, y + height);
		context.bezierCurveTo(x + width/2, y+height/2, x, y + height*(3/4),x,y+height*(3/8));
		context.quadraticCurveTo(x + width*(1/4), y, x + width/2, y+height*(3/8));
		context.moveTo(x+width/2, y+height);
		context.bezierCurveTo(x+width/2,y+height/2,x+width, y+height*(3/4),x+width, y+height*(3/8));
		context.quadraticCurveTo(x + width*(3/4), y, x + width/2, y + height*(3/8));
		context.closePath();
	}
	function drawDiamond(x,y,width,height){
		context.beginPath();
		context.moveTo(x+width/2, y+height);
		context.lineTo(x,y+height/2);
		context.lineTo(x+width/2,y);
		context.lineTo(x+width,y+height/2);
		context.lineTo(x+width/2,y+height);
		context.closePath();
	}
	function drawClub(x,y,width,height){
		context.beginPath();
		context.moveTo(x+width/2, y+height);
		context.lineTo(x+width*(1/4), y+height);
		context.quadraticCurveTo(x+width/2,y+height,x+width*(7/16),y+height*(3/4));
		context.bezierCurveTo(x,y+height,x,y+height*(1/4),x+width*(3/8),y+height/2);
		context.bezierCurveTo(x,y,x+width,y,x+width*(5/8),y+height/2);
		context.moveTo(x+width/2, y+height);
		context.lineTo(x+width*(3/4),y+height);
		context.quadraticCurveTo(x+width/2,y+height,x+width*(9/16),y+height*(3/4));
		context.bezierCurveTo(x+width,y+height,x+width,y+height*(1/4),x+width*(5/8),y+height/2);
		context.closePath();
	}
	function drawSpade(x,y,width,height){
		context.beginPath();
		context.moveTo(x+width/2, y+height);
		context.lineTo(x+width*(1/4), y+height);
		context.quadraticCurveTo(x+width/2,y+height,x+width*(7/16),y+height*(3/4));
		context.quadraticCurveTo(x+width*(1/8),y+height*(7/8),x,y+height*(5/8));
		context.bezierCurveTo(x,y+height*(1/4),x+width/2,y+height/2,x+width/2,y);
		context.moveTo(x+width/2, y+height);
		context.lineTo(x+width*(3/4),y+height);
		context.quadraticCurveTo(x+width/2,y+height,x+width*(9/16),y+height*(3/4));
		context.quadraticCurveTo(x+width*(7/8),y+height*(7/8),x+width,y+height*(5/8));
		context.bezierCurveTo(x+width,y+height*(1/4),x+width/2,y+height/2,x+width/2,y);
		context.closePath();
	}
	
	var Foundation = (function(num){
		var f = {};
		
		var _cards = [];
		var suit;
		var next = 0;
		
		f.addCard = function(card){
			if((card.getSuit() != suit && suit != undefined) || (card.getValue() != next) || (card.getChild() != undefined)){
				return false;
			}
			else {
				_cards.push(card);
				card.clearPosition();
				card.setFoundation(f);
				next++;
				
				if(suit == undefined){
					suit = card.getSuit();
				}
				
				return true;
			}
		}
		
		f.iscomplete = function(){
			return _cards.length == 13;
		}
		
		f.getTopCard = function(){
			if(_cards.length > 0){
				next--;
				if(next == 0){
					suit == undefined;
				}
				
				return _cards.splice(_cards.length - 1, 1)[0];
			}
			else {
				return undefined;
			}
		}
		
		f.draw = function(){
			drawRect(tableauWidth * (3 + num) + cardWidth/2, 0, cardWidth, cardHeight, 4);
			context.strokeStyle = "#B0B7BC";
			context.lineWidth = 5;
			context.stroke();
			
			for(var i=0;i<_cards.length;i++){
				_cards[i].draw(tableauWidth * (3+num) + cardWidth/2, 0, true);
			}
		}
		
		return f;
	});
	
	var Stock = (function(){
		var s = {};
		var _cards = [];
		var active = [];
		var waste = [];
		
		s.addCard = function(card){
			_cards.push(card);
		}
		
		s.checkClick = function(x){
			if(x < tableauWidth){
				var flipCards;
				if(_cards.length > 0){
					if(_cards.length >= 3){
						flipCards = _cards.splice(0, 3);
					}
					else {
						flipCards = _cards.splice(0, _cards.length);
					}
				}
				else {
					waste = waste.concat(active);
					active = [];
					_cards = _cards.concat(waste);
					waste = [];
				}
				
				if(flipCards != undefined){
					waste = waste.concat(active);
					active = [];
					for(var i=0;i<flipCards.length;i++){
						active.push(flipCards[i]);
					}
				}
				
				return undefined;
			}
			else {
				return active.splice(active.length - 1, 1)[0] || waste.splice(waste.length - 1, 1)[0];
			}
		}
		
		s.replaceActiveCard = function(card){
			active.push(card);
			card.clearPosition();
		}
		
		s.draw = function(x, y){
			context.beginPath();
			context.arc(x+cardWidth/2, y+cardHeight/2, cardWidth/2 - 16, 0, 2*Math.PI, false);
			context.closePath();
			context.strokeStyle = "#B0B7BC";
			context.lineWidth = 5;
			context.stroke();
			for(var i=0;i<_cards.length;i++){
				_cards[i].draw(x+i,y);
			}
			
			for(var j=0;j<waste.length;j++){
				waste[j].draw(x+tableauWidth,0, true);
			}
			
			for(var k=0;k<active.length;k++){
				active[k].draw(x+tableauWidth + 12 * k, 0, true);
			}
		}
		
		return s;
	});
	
	var Tableau = (function(){
		var t = {};
		var _cards = [];
		var baseCard, topCard;
		
		t.addCard = function(card){
			_cards.push(card);
			topCard = card;
			card.setTableau(t);
			if(card.getChild() != undefined){
				t.addCard(card.getChild());
			}
			card.clearPosition();
		}
		
		t.moveCardTo = function(card){
			var flipTop = false;
			if(topCard != undefined && !topCard.addChild(card)){
				return false;
			}
			if(topCard == undefined && card.getValue() != 12){
				return false;
			}
			else if(topCard == undefined && card.getValue() == 12){
				flipTop = true;
			}
			
			_cards.push(card);
			card.clearPosition();
			topCard = card;
			if(flipTop){
				t.flipTop();
			}
			card.setTableau(t);
			if(card.getChild() != undefined){
				t.moveCardTo(card.getChild());
			}
			
			return true;
		}
		
		t.flipTop = function(){
			baseCard = topCard;
		}
		
		t.draw = function(x, y){
			var up = false;
			var upIndex = 1;
			for(var i=0;i<_cards.length;i++){
				var yOffset = ((up) ? 4 * i + 12 * upIndex: 4 * i);
				if(up){
					upIndex++;
				}
				if(_cards[i] == baseCard){
					up = true;
				}
				_cards[i].draw(x + cardWidth/2, y + yOffset, up);
			}
		}
		
		t.removeCard = function(card){
			for(var i=0;i<_cards.length;i++){
				if(_cards[i] == card){
					_cards.splice(i, 1);
					if(i > 0){
						topCard = _cards[i-1];
					}
					else {
						topCard = undefined;
					}
					
					if(card.getChild() != undefined){
						t.removeCard(card.getChild());
					}
					break;
				}
			}
		}
		
		t.checkForClick = function(x, y){
			if(x < cardWidth / 2 || x > cardWidth * 1.5){
				return undefined;
			}
			
			var up = false;
			var activeCard;
			var upIndex = 1;
			for(var i=0;i<_cards.length;i++){
				var yOffset = ((up) ? 4 * i + 12 * upIndex: 4 * i);
				if(up){
					upIndex++;
				}
				if(_cards[i] == baseCard){
					up = true;
				}
				
				if(y >= yOffset && y <= yOffset + cardHeight && up){
					activeCard = _cards[i];
				}
			}
			
			if(!activeCard && !up){
				if(_cards.length > 0){
					t.flipTop();
					draw();
				}
			}
			
			return activeCard;
		}
		
		t.toString = function(){
			var response = "";
			var suits = ["Hearts", "Clubs", "Diamonds", "Spades"];
			var values = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"];
			for(var i=0;i<_cards.length;i++){
				response += "\n\t" + values[_cards[i].getValue()] + " of " + suits[_cards[i].getSuit()];
			}
			
			return response;
		}
		
		return t;
	});

	var Card = (function(num){
		var c = {};
		var suit = Math.floor(num/13);
		var value = num%13;
		var tableau, foundation;
		var child, parent;
		var xPos, yPos;
		
		c.getSuit = function(){
			return suit;
		}
		
		c.getValue = function(){
			return value;
		}
		
		c.setTableau = function(_tableau){
			tableau = _tableau;
		}
		
		c.setFoundation = function(_foundation){
			tableau = undefined;
			foundation = _foundation;
		}
		
		c.getTableau = function(){
			return tableau;
		}
		
		c.getFoundation = function(){
			return foundation;
		}
		
		c.addChild = function(card){
			if(card.getSuit()%2 == suit%2){
				return false;
			}
			
			if(card.getValue() != value - 1){
				return false;
			}
			
			child = card;
			card.setParent(c);
			return true;
		}
		
		c.setParent = function(card){
			if(parent != undefined){
				parent.removeChild();
			}
			parent = card;
		}
		
		c.getChild = function(){
			return child;
		}
		
		c.removeChild = function(){
			child = undefined;
		}
		
		c.setPosition = function(x, y){
			xPos = x;
			yPos = y;
		}
		
		c.clearPosition = function(){
			xPos = yPos = undefined;
		}
		
		c.draw = function(x, y, up){
			if(xPos != undefined){
				x = xPos - cardWidth / 2;
			}
			if(yPos != undefined){
				y = yPos - cardHeight / 2;
			}
			
			drawRect(x, y, cardWidth, cardHeight, 4);
			context.fillStyle = "#FFFFFF";
			context.fill();
			context.strokeStyle = "#455560";
			context.lineWidth = 1;
			context.stroke();
			
			if(!up){
				drawRect(x + 4, y + 4, cardWidth - 8, cardHeight - 8, 4);
				context.fillStyle = "#0067B1";
				context.fill();
				
				drawLogo(x+8,y+12);
			}
			else {
				drawFace(suit, value, x, y);
			}
		}
		
		return c;
	});
	
	startGame();
	
	return true;
});

