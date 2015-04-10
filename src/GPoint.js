/*
 * Point class. A GPoint is composed of two coordinates (x, y) and a text label
 */
function GPoint() {
	var x, y, label;

	if (arguments.length === 3) {
		x = arguments[0];
		y = arguments[1];
		label = arguments[2];
	} else if (arguments.length === 2 && arguments[0] instanceof p5.Vector) {
		x = arguments[0].x;
		y = arguments[0].y;
		label = arguments[1];
	} else if (arguments.length === 2) {
		x = arguments[0];
		y = arguments[1];
		label = "";
	} else if (arguments.length === 1 && arguments[0] instanceof GPoint) {
		x = arguments[0].getX();
		y = arguments[0].getY();
		label = arguments[0].getLabel();
	} else if (arguments.length === 1 && arguments[0] instanceof p5.Vector) {
		x = arguments[0].x;
		y = arguments[0].y;
		label = "";
	} else if (arguments.length === 0) {
		x = 0;
		y = 0;
		label = "";
	} else {
		throw new Error("GPoint constructor: signature not supported");
	}

	this.x = x;
	this.y = y;
	this.label = label;
	this.valid = this.isValidNumber(this.x) && this.isValidNumber(this.y);
}

GPoint.prototype.isValidNumber = function(number) {
	return !isNaN(number) && isFinite(number);
};

GPoint.prototype.set = function() {
	var x, y, label;

	if (arguments.length === 3) {
		x = arguments[0];
		y = arguments[1];
		label = arguments[2];
	} else if (arguments.length === 2 && arguments[0] instanceof p5.Vector) {
		x = arguments[0].x;
		y = arguments[0].y;
		label = arguments[1];
	} else if (arguments.length === 2) {
		x = arguments[0];
		y = arguments[1];
		label = "";
	} else if (arguments.length === 1 && arguments[0] instanceof GPoint) {
		x = arguments[0].getX();
		y = arguments[0].getY();
		label = arguments[0].getLabel();
	} else if (arguments.length === 1 && arguments[0] instanceof p5.Vector) {
		x = arguments[0].x;
		y = arguments[0].y;
		label = "";
	} else {
		throw new Error("GPoint.set(): signature not supported");
	}

	this.x = x;
	this.y = y;
	this.label = label;
	this.valid = this.isValidNumber(this.x) && this.isValidNumber(this.y);
};

GPoint.prototype.setX = function(x) {
	this.x = x;
	this.valid = this.isValidNumber(this.x) && this.isValidNumber(this.y);
};

GPoint.prototype.setY = function(y) {
	this.y = y;
	this.valid = this.isValidNumber(this.x) && this.isValidNumber(this.y);
};

GPoint.prototype.setLabel = function(label) {
	this.label = label;
};

GPoint.prototype.setXY = function() {
	var x, y;

	if (arguments.length === 2) {
		x = arguments[0];
		y = arguments[1];
	} else if (arguments.length === 1 && arguments[0] instanceof GPoint) {
		x = arguments[0].getX();
		y = arguments[0].getY();
	} else if (arguments.length === 1 && arguments[0] instanceof p5.Vector) {
		x = arguments[0].x;
		y = arguments[0].y;
	} else {
		throw new Error("GPoint.setXY(): signature not supported");
	}

	this.x = x;
	this.y = y;
	this.valid = this.isValidNumber(this.x) && this.isValidNumber(this.y);
};

GPoint.prototype.getX = function() {
	return this.x;
};

GPoint.prototype.getY = function() {
	return this.y;
};

GPoint.prototype.getLabel = function() {
	return this.label;
};

GPoint.prototype.getValid = function() {
	return this.valid;
};

GPoint.prototype.isValid = function() {
	return this.valid;
};
