//Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

// TODO: add hour lines if zoomed in really far
// TODO: clean up that MESS at the top :p
// TODO: make the repeat week/day things more user-friendly

/******************
 * features I want:
 * - keep track of stats ie
 * 	 - furthest completed ahead of time
 *   - biggest task completed
 *   - most tasks completed in a day
 *   - maybe even leaderboard with yourself?
 * - show arrows when scrolling
 * x display weekend dates in -red- blue
 * x allow dragging the background to scroll
 * - clean up that panel!
 * - make graphics for "add new" button
 * - add colour-change buttons
 */

$(document).ready(function () {
	var CL = {
			CLEAN: true,
			MAXR: 60,
			MINR: 10,
			HEIGHT: 600,
			WIDTH: 300,
			NOW: 400, // height of right now
			SNAPMARGIN: 10,
			SCROLL: 15,
			scale: 2000000,
			cats: [],
			currCat: null,
			originalY: 0, // original y-pos of what we started dragging
			xPosInCurrCat: 0,
			yPosInCurrCat: 0, // where we are wrt center of draggee
			grabbedY: 0, // y-coordinate of where we grabbed to drag
			weeksLeft: 0,
			daysLeft: 0,
			hoursLeft: 0,
			mousedown: false,
			debug: (function (s) {
				$('#debug').text(s);
			}),
			scrollSpeed: 0,
			zoomSpeed: 0, // UNUSED
			growing: false,
			adding: false,
			typingInTextbox: false,
			calname: "test",
			writable: true,
			dragging: false, 
			hash: null,
			anims: [],
			onlyIfIncomplete: [$('#repeatsection'),
			                   $('#awesome'),
			                   $('#youvegot'),
			                   $('#todothis')
			                   
			],
			onlyIfComplete: [$('#yourockwoohoo'),
			                 $('#youdid'),
			                 $('#beforedue')]
	};



	
	/********************
	 * Debug functions. 
	 */
	CL.message = function (s) {
		// pop up a reasonably graceful error
		alert(s);
	};

	CL.setUnwritable = function () {
		CL.writable = false;
		CL.handleKeyPress = function () {

		};
		$('#addnew').addClass("hidden");
		$('#remove').addClass("hidden");
		$('#savecal').addClass("hidden");
	};

	CL.setWritable = function () {
		CL.writable = true;
		$('#addnew').removeClass("hidden");
		$('#remove').removeClass("hidden");
		$('#savecal').removeClass("hidden");
	};


	CL.setCookie = function () {
		$.cookie("calname", CL.calname, {expires: 7 });
	};
	
	CL.readCookie = function () {
		if ($.cookie("calname")) {
			$('#popup').hide();
			CL.calname = $.cookie("calname");
			CL.load();
		}
	};
	
	CL.hashString = function (s) {
		if (s === "") {
			// if empty, interpret as "no password"
			// god help them if they want to use "" as a pw
			CL.hash = "";
		} else {
			CL.hash = rstr_md5(s);
		}
	};

	CL.Cat = function (original) {
		var prop;
		if (original) { // copy over properties, for json
			for (prop in original) {
				if (original.hasOwnProperty(prop)) {
					this[prop] = original[prop];
				}
			}
			this.streak++;
		}
		else {
			this.frac = 0;
			this.text = "";
			this.color = "70, 70, 70";
			this.r = 20;
			this.startingr = 20;
			this.x = CL.WIDTH/2;
			this.y = CL.NOW;	
			this.repeatIn = 0;
			this.streak = 0;
		}
	};


	CL.Cat.prototype.overdue = function () {
		return (CL.yToDate(this.y).getTime() < Date.now())
	}
	
	CL.Cat.prototype.contains = function (ev) {
		return (this.distSqTo(ev) < (this.r * this.r));
	}


	CL.Cat.prototype.distSqTo = function (ev) {
		var dx = this.x - CL.x(ev);
		var dy = this.y - CL.y(ev);
		CL.debug((dx * dx) + (dy * dy));
		return ((dx * dx) + (dy * dy));
	}

	CL.Cat.prototype.getDate = function () { 
		return (CL.yToDate(this.y));
	};
	
	CL.Cat.prototype.updateDate = function () {
		this.date = CL.yToDate(this.y).getTime();
	};
	
	CL.Cat.prototype.updateY = function () {
		if (this.date) {
			this.y = CL.dateToY(new Date(this.date));
		}
	}

	CL.Cat.prototype.setColor = function (newcolor) {
		this.color = newcolor;
	};

	CL.Cat.prototype.draw = function () {
		var t, star = CL.star; 
		if (this.streak > 2) { star = CL.veryHappyStar; }
		if (this.streak > 5) { star = CL.superHappyStar; }
		if (CL.CLEAN) { star = CL.cleanStar; }
		CL.ctx.drawImage(star, this.x - this.r, this.y - this.r, this.r*1.8, this.r*1.8);
		if (this.frac !== 1) {
			CL.ctx.fillStyle = "rgba(" + this.color + ", 0.4)";
			CL.window.drawCircle(this);
		}
		 
		CL.ctx.fillStyle = "rgb(" + this.color + ")";
		CL.ctx.save();
		CL.window.drawSlice(this, this.frac);
		CL.window.clipSlice(this, this.frac);
		if (CL.CLEAN) {
			CL.window.drawCircle(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
		} else {
			CL.ctx.drawImage(CL.grawr, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
		}
		CL.ctx.restore();
		if ((this.frac !== 1) || (CL.CLEAN)) {
			CL.ctx.fillStyle = (this.frac == 1) ? "#000" : "#FFF";
			t = (this.r/5 < this.text.length) ? 
					this.text.substring(0, this.r/5) + "..." : this.text;
					CL.ctx.fillText(t, this.x, this.y);
		}
		if (CL.currCat == this) {
			//CL.ctx.strokeStyle = "#F00";
			//CL.window.drawEmptyCircle(this);
			CL.ctx.strokeStyle = "#000";
			CL.ctx.lineWidth = 1;
			CL.window.drawEmptyCircle(this);
		};
	}; // circles for now


	CL.hide = function (o) {
		o.addClass("hidden");
	}

	CL.unhide = function (o) {
		o.removeClass("hidden");
	}
	
	CL.setCurrCat = function (c) {
		CL.currCat = c;
		$('#rightpanel').removeClass("hidden");
	};

	
	
	CL.clearCurrCat = function () {
		CL.currCat = null;
		$('#rightpanel').addClass("hidden");
		$('#timetextbox').addClass("hidden");
	};

	CL.removeCat = function (cat) {
		if (CL.currCat === cat) {
			CL.currCat = null;
		}
		CL.cats.remove(CL.cats.indexOf(cat));
	}

	CL.x = function (ev) { // account for offset -- see http://api.jquery.com/event.pageX/
		return (ev.pageX - CL.offLeft);
	};

	CL.y = function (ev) { // account for offset -- see http://api.jquery.com/event.pageX/
		return (ev.pageY - CL.offTop);
	};

	CL.drawLines = function () {
		var date;
		CL.ctx.save();
		date = new Date(Date.now());
		CL.ctx.strokeStyle = "#F88"; // I don't like repeating this code
		y = CL.dateToY(date); // TODO maybe make a "draw line at date" fn
		CL.ctx.beginPath();
		CL.ctx.moveTo(0, y);
		CL.ctx.lineTo(CL.WIDTH, y);
		CL.ctx.lineWidth = 2;
		CL.ctx.stroke();

		date = new Date(CL.yToDate(CL.HEIGHT));
		date.setHours(0); // this date is midnight, the earliest day visible
		date.setMinutes(0);
		date.setSeconds(0);
		CL.ctx.fillStyle = "#000";
		CL.ctx.textAlign = "left";
		CL.ctx.lineWidth = 1;
		while (CL.dateToY(date) > 0) {
			CL.ctx.strokeStyle = "#DDD";
			date = new Date(date.getTime() + 86400000); // 86400 000 is a day in ms
			y = CL.dateToY(date);
			CL.ctx.beginPath();
			CL.ctx.moveTo(0, y);
			CL.ctx.lineTo(CL.WIDTH, y);
			if ((date.getDay() === 0) || (date.getDay() === 6)) {
				CL.ctx.strokeStyle = "#88A";
			}
			if ((date.getDay() === 0) || (CL.scale < 9000000)) {
				CL.ctx.stroke();
				CL.ctx.fillText(CL.dateToString(CL.yToDate(y)), 10, y - 5);
			}
		}
		CL.ctx.restore();
	};

	CL.months = ["jan", "feb", "mar", "apr", "may", "june", "july", "aug", "sep", "oct", "nov", "dec"];
	CL.days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

	CL.zoomIn = function () {
		var i;
		for (i = 0; i < CL.cats.length; i++) {
			CL.cats[i].updateDate();
	}
		CL.scale = CL.scale * 0.9;
		for (i = 0; i < CL.cats.length; i++) {
			CL.cats[i].updateY();
	}
	};

	CL.zoomOut = function () {
		var i;
		for (i = 0; i < CL.cats.length; i++) {
			CL.cats[i].updateDate();
	}
		CL.scale = CL.scale / 0.9;
		for (i = 0; i < CL.cats.length; i++) {
			CL.cats[i].updateY();
	}
	};

	
	
	
	CL.yToDate = function (y) {
		return new Date((CL.NOW - y) * CL.scale + Date.now());	
	};

	CL.dateToY = function (d) {
		if (!d.getTime) alert(d);
		return (CL.NOW - (d.getTime() - Date.now())/CL.scale);
	};

	
	
	CL.dateToString = function (d) {
		return (CL.days[d.getDay()] + " " + CL.months[d.getMonth()] + " " + d.getDate());
	};

	CL.timeToString = function (d) {
		var minutes = (d.getMinutes() < 10) ? "0" + d.getMinutes() : d.getMinutes();
		return (d.getHours() + ":" + minutes);
	};

	CL.timeUntilToString = function (ms) {
		var output = "", n, past = false;
		CL.weeksLeft = 0; // reset everything
		CL.daysLeft = 0;
		CL.hoursLeft = 0; 
		if (Math.abs(ms) < 60000) return "right now!";
		if (ms > 0) {
			output = "in ";
		} else {
			past = true;
			ms *= -1;
		}
		if (ms > 604800000000) { // this can probably be simplified :-/
			n = Math.floor(ms / 604800000000); // weeks!
			ms -= 604800000000 * n;
			CL.weeksLeft = n;
			output += n;
			output += (n === 1) ? " week, " : " weeks, ";
		}
		if (ms > 86400000) { // days!
			n = Math.floor(ms / 86400000);
			ms -= 86400000 * n;
			CL.daysLeft = n;
			output += n;
			output += (n === 1) ? " day, " : " days, ";
		}
		if (ms > 3600000) { // hours!
			n = Math.floor(ms / 3600000);
			ms -= 3600000 * n;
			CL.hoursLeft = n;
			output += n;
			output += (n === 1) ? " hour, " : " hours, "	;
		}

		if (ms > 60000) { // minutes!
			n = Math.floor(ms / 60000);
			ms -= 60000 * n;
			output += n;
			output += (n === 1) ? " minute, " : " minutes, "	;
		}
		output = output.substring(0, output.length - 2); // truncate last comma
		if (past) {
			output += " ago";
		}
		return output;
	};

	CL.window = {};


	CL.window.clear = function () {
		CL.ctx.clearRect(0, 0, CL.WIDTH, CL.HEIGHT);
	};

	CL.window.drawCircle = function (o) {
		CL.ctx.beginPath();
		CL.ctx.arc(o.x, o.y, o.r, 0, 360, false);
		CL.ctx.fill();
	};
	
	

	CL.window.drawEmptyCircle = function (o) {
		CL.ctx.beginPath();
		CL.ctx.arc(o.x, o.y, o.r + 3, 0, 360, false);
		CL.ctx.stroke();
	};

	CL.window.drawSlice = function (o, fraction) {
		fraction = 1-fraction;
		CL.ctx.beginPath();	
		CL.ctx.arc(o.x, o.y, o.r, Math.PI*1.5, (Math.PI * 1.5) + (Math.PI * 2 * fraction), false);
		CL.ctx.lineTo(o.x, o.y);
		CL.ctx.lineTo(o.x, o.y - o.r);
		CL.ctx.fill();
	}

	CL.window.clipSlice = function (o, fraction) {
		fraction = 1-fraction;
		CL.ctx.beginPath();
		CL.ctx.arc(o.x, o.y, o.r, Math.PI*1.5, (Math.PI * 1.5) + (Math.PI * 2 * fraction), false);
		CL.ctx.lineTo(o.x, o.y);
		CL.ctx.lineTo(o.x, o.y - o.r);
		CL.ctx.clip();
	}
	
	CL.findClosest = function (ev) {
		var i, distsq = 999999999, thisdist, nearest;
		CL.clearCurrCat();
		for (i = 0; i < CL.cats.length; i++) {
			thisdist = CL.cats[i].distSqTo(ev);
			if (thisdist < distsq) {
				distsq = thisdist; 
				nearest = CL.cats[i];
			}
		}
		CL.setCurrCat(nearest);
		return CL.currCat;
	};

	CL.drawAll = function () {
		var i;
		CL.window.clear();
		CL.drawLines();
		for (i = 0; i < CL.cats.length; i++) {
			CL.cats[i].draw();
		}
		if (CL.currCat !== null) {
			CL.currCat.draw(); // make sure current is on top
		}
	}

	CL.loadImages = function () {
		CL.star = new Image();
		CL.star.src = "happystar.png";
		CL.veryHappyStar = new Image();
		CL.veryHappyStar.src = "veryhappystar.png";
		CL.superHappyStar = new Image();
		CL.superHappyStar.src = "superhappystar.png";
		CL.cleanStar = new Image();
		CL.cleanStar.src = "cleanstar.png";
		CL.grawr = new Image();
		CL.grawr.src = "grawrv.png";
		
	};
	
	CL.init = function () {
		CL.loadImages();
		CL.ctx = document.getElementById('canvas').getContext('2d');
		CL.HEIGHT = $(window).height() - 200;
		$("#canvas").attr("height", CL.HEIGHT);
		$("#yourockwoohoo").addClass("hidden");
		CL.NOW = 0.6 * CL.HEIGHT;
		CL.ctx.textAlign = "center";
		CL.ctx.textBaseline = "middle";
		CL.ctx.lineWidth = "3";
		CL.offLeft = $("#canvas").offset().left;
		CL.offTop = $("#canvas").offset().top;

		CL.cats = new Array();
		CL.clearCurrCat();
		CL.resetCalName();
		CL.readCookie();
		CL.linkInputAndDisplay($('#textinput'),$('#text'));

		//CL.autosave(); // TODO: make this work...
		CL.update();
	};

	CL.scrollTo = function (d) {
		var i, oldnow, dy;
		oldnow = CL.NOW;
		CL.NOW = CL.dateToY(d);
		dy = CL.NOW - CL.dateToY(oldnow);
		for (i = 0; i < CL.cats.length; i++) {
			CL.cats[i].y += dy;
		}
	};
	
	CL.handleMouseMove = function (ev) {
		var dy, i;
		if (CL.mousedown) {
			if (CL.currCat && CL.dragging) { // move the cat being dragged
				CL.currCat.x = CL.x(ev) - CL.xPosInCurrCat;
				CL.currCat.y = CL.y(ev) - CL.yPosInCurrCat;
				if (Math.abs(CL.currCat.y - CL.originalY) < CL.SNAPMARGIN) {
					CL.currCat.y = CL.originalY;
				}
				CL.updatePanel();
			} else {
				// scroll amount dragged
				dy = CL.grabbedY - CL.y(ev);
				CL.grabbedY = CL.y(ev);
				CL.NOW -= dy;
				for (i = 0; i < CL.cats.length; i++) {
					CL.cats[i].y -= dy;
				}
			}
		}
		if (CL.y(ev) < CL.SCROLL) {
			CL.scrollSpeed = 1;
		} else {
			if (CL.y(ev) > CL.HEIGHT - CL.SCROLL) {
				CL.scrollSpeed = -1;
			} else {
				CL.scrollSpeed = 0;
			}
		}

	};

	CL.handleMouseUp = function (ev) {
		CL.mousedown = false;
		CL.growing = false;
	};

	CL.handleMouseDown = function (ev) {
		CL.offLeft = $("#canvas").offset().left;
		CL.offTop = $("#canvas").offset().top;
		// update offfets, just in case
		CL.grabbedY = CL.y(ev);
		CL.mousedown = true;
		CL.dragging = false;
		var prevCurr = CL.currCat;
		CL.findClosest(ev);
		CL.updatePanel();
		if ((CL.currCat === prevCurr) && CL.writable) {
			CL.dragging = true;
		}
		if (CL.currCat) {
			if (CL.currCat.contains(ev)) {
				CL.xPosInCurrCat = CL.x(ev) - CL.currCat.x;
				CL.yPosInCurrCat = CL.y(ev) - CL.currCat.y;
				CL.originalY = CL.currCat.y;
				return;
			}
		}
		CL.clearCurrCat();
		if (CL.adding) {
			CL.addCat(CL.x(ev), CL.y(ev));
			$('#addnew').removeClass("textbuttonselected");
		}
	};

	CL.addCat = function (x, y) {
		CL.setCurrCat(new CL.Cat());
		CL.cats[CL.cats.length] = CL.currCat;
		CL.growing = true;
		CL.currCat.x = x;
		CL.currCat.y = y;
		CL.currCat.r = 10;
		CL.adding = false;
	}

	CL.update = function () {
		CL.stepAnims();
		CL.drawAll();
		//CL.debug(CL.calname);
		if (CL.mousedown && CL.growing && (CL.currCat !== null)) {
			if (CL.currCat.r < CL.MAXR) {
				CL.currCat.r += 0.5;
			}
		}
		if (CL.scrollSpeed !== 0) {
			CL.NOW+= CL.scrollSpeed;
			for (var i = 0; i < CL.cats.length; i++) {
				CL.cats[i].y += CL.scrollSpeed;
			}
		}
		return setTimeout(CL.update, 25);
	};

	CL.updatePanel = function () {
		var d;
		if (CL.currCat) { // wtf, why are both "woohoo" and "I'm done" buttons unhidden?
			if (CL.currCat.frac === 1) { // hide/unhide buttons
				CL.onlyIfIncomplete.map(CL.hide);
				CL.onlyIfComplete.map(CL.unhide);
				$('.numberblock').removeClass("demonic");
				$('.numberblock').addClass("angelic");
				if (CL.currCat.dateDone > CL.yToDate(CL.currCat.y).getTime()) {
					$('#beforedue').text("after it was due!")
				} else { $('#beforedue').text("before it was due!") }
			} else {
				CL.onlyIfIncomplete.map(CL.unhide);
				CL.onlyIfComplete.map(CL.hide);
				if (CL.currCat.overdue()) {
					$('.numberblock').addClass("demonic");
					$('#youvegot').text("You should've had this done");
					$('#todothis').text("ago, \n you lazy bastard")
				} else {
					$('#youvegot').text("You've got");
					$('#todothis').text("to do this.");
					$('.numberblock').removeClass("demonic");
				}
				$('.numberblock').removeClass("angelic");
			}

			d = CL.currCat.getDate();
			$('#duedate').text(CL.dateToString(d));
			$('#duetime').text(CL.timeToString(d));
			if (CL.currCat.frac === 1) {
				CL.timeUntilToString(d.getTime() - CL.currCat.dateDone)
			} else { CL.timeUntilToString(d.getTime() - Date.now()); }
			
			$('#weekdisplay').text(CL.weeksLeft);
			$('#daydisplay').text(CL.daysLeft);
			$('#hourdisplay').text(CL.hoursLeft);
			$('#text').text(CL.currCat.text); 
		}
	};

	CL.setFracTo = function (c, f) { // oh this is soemthing about setting a pie to more-done...
		var oldfrac = c.frac, totalframes = 15; // keep track of anim relative to this, but the "real" c.frac gets changed right away
		CL.anims[CL.anims.length] = {
				t: totalframes, // number of frames left
				f: function () { // SINE FUCK YEAH
					c.frac = oldfrac + (Math.sin(Math.PI * 
							(totalframes - this.t)/(totalframes * 2))) * (f - oldfrac);
				},
				cleanup: function () {
					c.frac = f; // SUCK IT ZENO.
				}
		}
	};

	CL.makeProgressOnCurr = function () {
		if (CL.currCat) {
			CL.setFracTo(CL.currCat, 1 - (1 - CL.currCat.frac) * 3/4);
		}
	};

	CL.finishCurr = function () {
		var newdate;

		
		if (CL.currCat) {
			if (CL.currCat.frac !== 1) {
				if (CL.currCat.overdue()) {
					CL.currCat.streak = 0;
				}
				CL.setFracTo(CL.currCat, 1);
				CL.currCat.dateDone = Date.now();
				if (CL.currCat.repeatIn) {
					newdate = new Date(CL.yToDate(CL.currCat.y).getTime() + CL.currCat.repeatIn);
					CL.duplicateCat(CL.currCat);
					CL.currCat.y = CL.dateToY(newdate);
					CL.currCat.frac = 0;
				}
			}

		}
	};

	CL.duplicateCat = function (c) { // dammit, I'm going to do this later SLEEP NOW. 
		CL.setCurrCat(new CL.Cat(c));
		CL.cats[CL.cats.length] = CL.currCat;
	}

/*	CL.setRepeat = function () {
		if (CL.currCat) {
			switch ($(':checked').val()) {
			case "week":
				CL.currCat.repeatIn = 604800000;
				break;
			case "day":
				CL.currCat.repeatIn = 86400000;
				break;
			default:
				CL.currCat.repeatIn = 0;
			break;
			}	
		}
	}
*/
	CL.stepAnims = function () {
		var i;
		for (i = 0; i < CL.anims.length; i++) {
			CL.anims[i].f();
			CL.anims[i].t--;
			if (CL.anims[i].t < 1) {
				CL.anims[i].cleanup();
				CL.anims.remove(i);
			}
		}
	};

	CL.handleKeyPress = function (ev) {
		/*var c = String.fromCharCode(ev.which);
		if (CL.writable) {
			if (CL.typingInTextbox) {
				if (ev.which === 13) { // need to determine which textbox has focus
					CL.saveTime();
				}
				return;
			}
			if (ev.which === 13) {
				CL.clearCurrCat();
				return;
			}
			if (CL.currCat != null) {
				if (c == "\b") {
					CL.currCat.text = CL.currCat.text.substring(0, CL.currCat.text.length - 1);
				} else {
					CL.currCat.text += c;
				}
				CL.updatePanel();
				CL.currCat.draw();
			}
		}*/
		
		
	};


	CL.handleMouseOut = function () {
		CL.scrollSpeed = 0;
	}

	CL.growCurrCat = function () {
		if (CL.currCat !== null) {
			if (CL.currCat.r < CL.MAXR) {
				CL.currCat.r += 5;
			}
		}
	};

	CL.shrinkCurrCat = function () {
		if (CL.currCat !== null) {
			if (CL.currCat.r > CL.MINR) {
				CL.currCat.r -= 5;
			}
		}
	};

	CL.clickAdd = function () {
		if (CL.writable) {
			$('#addnew').addClass("textbuttonselected");
			CL.adding = true;
			CL.clearCurrCat();
		}
	};

	CL.removeCurrCat = function (ev) {
		if (CL.currCat != null) {
			CL.removeCat(CL.currCat);
		}
	};

	CL.linkInputAndDisplay = function (input, display) {
		display.click(function () {
			CL.typingInTextbox = true;
			input.removeClass("hidden");
			input.val(display.text());
			input.focus();
			alert("unhiding input");
		});
		input.focusout(function () {
			CL.typingInTextbox = false;
			input.addClass("hidden");
		});
		
		// TODO: set position/css
		input.css('position', 'absolute');
		input.position({
			my:'right top',
			at:'right top',
			of: display
		});
	};
	
	CL.updateText = function () {
		if (CL.currCat !== null) {
			
		}
	};
	
	CL.clickTime = function () {
		// allow user to edit time
		CL.typingInTextbox = true;
		$('#timetextbox').removeClass("hidden");
		$('#timetextbox').val($('#duetime').text());
		$('#timetextbox').focus();
	};

	CL.saveTime = function () {
		var indate, origidate;
		CL.typingInTextbox = false;
		$('#timetextbox').addClass("hidden");
		if (CL.currCat !== null) {
			indate = Date.parse("Jan 1 " +$('#timetextbox').val() + ", 2013");
			if (isNaN(indate)) {
				return;
			}
			indate = new Date(indate);
			origidate = CL.currCat.getDate();
			origidate.setHours(indate.getHours());
			origidate.setMinutes(indate.getMinutes());
			origidate.setSeconds(indate.getSeconds());
			CL.currCat.y = (CL.dateToY(origidate));
			$('#duetime').text(CL.timeToString(origidate));
		}
	};

	
	/***********************************
	 * Save functions. 
	 */
	CL.saveNew = function (s) { // this isn't getting called when it should be, it seems?
		var url = "makeNew.php";

		CL.hashString($('#password').val());
		$.post(url, {calname: s, hash: CL.hash}, function (data) {
			if (!data) {
//				CL.save();
				CL.calname = s;
				$('#calname').text(CL.calname);
				return true;
			}
			else {
				CL.message(data);
				$('#calnametextbox').val(CL.calname);
				return false;
			}
		})
	};

	CL.save = function () {
		var url = "storeStuff.php", i;
		CL.calname = $("#calnametextbox").val();
		CL.hashString($('#password').val());
		for (i = 0; i < CL.cats.length; i++) {
			CL.cats[i].updateDate(); // deal with date messiness
		}
		$.post(url, { calname: CL.calname, list: JSON.stringify(CL.cats), settings: Date.now(), hash: CL.hash },
				function (data) {
			CL.message(data);
			var d = new Date(Date.now());
			$('#lastsaved').text("last saved " + CL.timeToString(d) + " " + CL.dateToString(d));
		}); // also send pw; php script should reject if invalid
		CL.setCookie();
	};
	
	CL.autosave = function () {
		if ($('#calnametextbox').val() === CL.calname) {
			CL.save();
		}
		return (setTimeout(CL.autosave, 600000)); // autosave every 10 mins
	};
	
	CL.clickSave = function () {
		//alert("calnametextbox: " + $('#calnametextbox').val() + "; calname: " + CL.calname);
			CL.save();
	};

	
	
	
	


	CL.clickLoad = function () {
		CL.submitCalName();
		//alert(CL.calName);
		if ($('#password').val().length > 0) {
			CL.load();
			CL.setWritable();
		} else {
			CL.loadReadOnly();
		}
		CL.setCookie();
	};

	CL.clickPopupCreate = function () {
		if (CL.saveNew($('#createcalname').val())) {
			$('#popup').hide();
		} else {
			
		}
	};
	
	CL.clickPopupLoad = function () {
		CL.calname = $('#loadcalname').val();
		CL.load();
		$('#calname').text(CL.calname);
		$('#popup').hide();
	};
	
	CL.parseJSON = function (data) {
		var i, indata, incats, writable, oldname;
		if (data.length > 4) {
			CL.cats = [];
			//alert(data);
			indata = JSON.parse(unescape(data.replace(/\\\"/g, "\"")));
			incats = indata[0];
			insettings = indata[1];
			writable = indata[2];
			if (writable) {
				CL.setWritable();
			} else {
				CL.setUnwritable();
			}
			CL.clearCurrCat();

			for (i = 0; i < incats.length; i++) {
				CL.cats[i] = new CL.Cat(incats[i]);
				CL.cats[i].updateY();
			} 
			CL.scrollTo(new Date(Date.now()))
			CL.drawAll(); 
		} else {
			alert("no saved calendar found; creating new calendar with that name");
			CL.reset();
		} // TODO have some way of checking for bad password

	}

	CL.reset = function () {
		CL.cats = [];
		CL.setWritable();
		CL.currCat = null;
	}
	
	CL.load = function () {
		var url = "getStuff.php";
		CL.hashString($('#password').val());
		$.get(url, {calname: CL.calname, hash: CL.hash}, CL.parseJSON);
		CL.ctx.fillText("loading...", CL.WIDTH/2, CL.WIDTH/2);
		$('#calname').text(CL.calname);
		$('#calnametextbox').text(CL.calname);
	};

	CL.loadReadOnly = function () {
	var url = "getStuff.php"; // not using getStuffReadOnly
	$.get(url, {calname: CL.calname}, CL.parseJSON);
	CL.ctx.fillText("loading...", CL.WIDTH/2, CL.WIDTH/2);
	CL.setUnwritable();
};
	

	CL.submitCalName = function () {
		// set CL.calname to what we've typed
		CL.calname = $('#calnametextbox').val();
		//alert(CL.calname);
		// hide the text box
		$('#calnametextbox').addClass("hidden");
		$('#calname').removeClass("hidden");
		$('#calname').text(CL.calname);
		CL.typingInTextbox = false;
	};

	CL.clickCalName = function () {
		$('#calnametextbox').removeClass("hidden");	
		$('#calnametextbox').focus();	
		$('#calnametextbox').val(CL.calname);
		$('#calname').addClass("hidden");
		CL.typingInTextbox = true;
	}

	CL.resetCalName = function () {
		// change textbox back when it loses focus
		$('#calnametextbox').addClass("hidden");
		$('#calname').removeClass("hidden");
		$('#calnametextbox').val(CL.calname);
		$('#calname').text(CL.calname);
		CL.typingInTextbox = false;
	}

	CL.makeColorChangeFunction = function (s) {
		this.f = function () {
			if (CL.currCat != null) {
				CL.currCat.color = s;
			}
		};
		return this.f;
	};


	CL.toggleRepeatDay = function () {
		if (CL.currCat) { // really, this has no business being called if it's NOT unnull
			// but we're being nice here
			if (CL.currCat.repeatIn !== 86400000) {
				CL.currCat.repeatIn = 86400000; // should I make this a var? hmmmm. nah
				$('#rday').addClass("hidden");
				$('#rsday').removeClass("hidden");
				// hide repeatWeek
				$('#rsweek').addClass("hidden");
				$('#rweek').removeClass("hidden");
				
			} else {
				CL.currCat.repeatIn = 0;
				$('#rsday').addClass("hidden");
				$('#rday').removeClass("hidden");
			}
			
		}
	}

	CL.toggleRepeatWeek = function () {
		if (CL.currCat) { // really, this has no business being called if it's NOT unnull
			// but we're being nice here
			if (CL.currCat.repeatIn !== 604800000) { // select
				CL.currCat.repeatIn = 604800000; // should I make this a var? hmmmm. nah
				$('#rweek').addClass("hidden");
				$('#rsweek').removeClass("hidden");
				// hide repeatWeek
				$('#rsday').addClass("hidden");
				$('#rday').removeClass("hidden");
				
			} else { // deselect
				CL.currCat.repeatIn = 0;
				$('#rsweek').addClass("hidden");
				$('#rweek').removeClass("hidden");
			}
			
		}
	}
	
	CL.init();

	$('#calname').click(CL.clickCalName);
//	$('#savepanel').mouseleave(CL.resetCalName);
	$('#password').focus(CL.clearCurrCat);
	$('#loadcal').click(CL.clickLoad);
	$('#savecal').click(CL.clickSave);
	$('#canvas').mousemove(CL.handleMouseMove);
	$('#canvas').mouseup(CL.handleMouseUp);
	$('#canvas').mousedown(CL.handleMouseDown);
	$('#canvas').mouseout(CL.handleMouseOut);
	$(document).keypress(CL.handleKeyPress);
	$('#timetextbox').focusout(CL.saveTime);
	$('#grow').click(CL.growCurrCat);
	$('#shrink').click(CL.shrinkCurrCat);
	$('#addnew').click(CL.clickAdd);
	$('#remove').click(CL.removeCurrCat);
	$('#zoomin').click(CL.zoomIn);
	$('#zoomout').click(CL.zoomOut);
	$('#duetime').click(CL.clickTime);
	$('#bluebutton').click(CL.makeColorChangeFunction("17, 68, 102"));
	$('#redbutton').click(CL.makeColorChangeFunction("93, 0, 0"));
	$('#greybutton').click(CL.makeColorChangeFunction("70, 70, 70"));
	$('#finish').click(CL.finishCurr);
	$('#progress').click(CL.makeProgressOnCurr);
	$('#repeatday').click(CL.toggleRepeatDay);
	$('#repeatweek').click(CL.toggleRepeatWeek);
	$('#loadbutton').click(CL.clickPopupLoad);
	$('#createbutton').click(CL.clickPopupCreate);
	$('#textinput').keyup(CL.updateText);
});