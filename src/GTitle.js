/*
 * Title class.
 */
function GTitle(parent, dim) {
	// The parent processing object
	this.parent = parent;

	// General properties
	this.dim = dim.slice();
	this.relativePos = 0.5;
	this.plotPos = this.relativePos * this.dim[0];
	this.offset = 10;

	// Text properties
	this.text = "";
	this.textAlignment = this.parent.CENTER;
	this.fontName = "Helvetica";
	this.fontColor = this.parent.color(100);
	this.fontStyle = this.parent.BOLD;
	this.fontSize = 13;
}

GTitle.prototype.draw = function() {
	this.parent.push();
	this.parent.textFont(this.fontName);
	this.parent.textStyle(this.fontStyle);
	this.parent.textSize(this.fontSize);
	this.parent.fill(this.fontColor);
	this.parent.noStroke();
	this.parent.textAlign(this.textAlignment, this.parent.BOTTOM);
	this.parent.text(this.text, this.plotPos, -this.offset - this.dim[1]);

	// There seems to be a bug in p5.js
	this.parent.textStyle(this.parent.NORMAL);
	this.parent.pop();
};

GTitle.prototype.setDim = function() {
	var xDim, yDim;

	if (arguments.length === 2) {
		xDim = arguments[0];
		yDim = arguments[1];
	} else if (arguments.length === 1) {
		xDim = arguments[0][0];
		yDim = arguments[0][1];
	} else {
		throw new Error("GTitle.setDim(): signature not supported");
	}

	if (xDim > 0 && yDim > 0) {
		this.dim[0] = xDim;
		this.dim[1] = yDim;
		this.plotPos = this.relativePos * this.dim[0];
	}
};

GTitle.prototype.setRelativePos = function(relativePos) {
	this.relativePos = relativePos;
	this.plotPos = this.relativePos * this.dim[0];
};

GTitle.prototype.setOffset = function(offset) {
	this.offset = offset;
};

GTitle.prototype.setText = function(text) {
	this.text = text;
};

GTitle.prototype.setTextAlignment = function(textAlignment) {
	if (textAlignment === this.parent.CENTER || textAlignment === this.parent.LEFT || textAlignment === this.parent.RIGHT) {
		this.textAlignment = textAlignment;
	}
};

GTitle.prototype.setFontName = function(fontName) {
	this.fontName = fontName;
};

GTitle.prototype.setFontColor = function(fontColor) {
	this.fontColor = fontColor;
};

GTitle.prototype.setFontStyle = function(fontStyle) {
	this.fontStyle = fontStyle;
};

GTitle.prototype.setFontSize = function(fontSize) {
	if (fontSize > 0) {
		this.fontSize = fontSize;
	}
};

GTitle.prototype.setFontProperties = function(fontName, fontColor, fontSize) {
	if (fontSize > 0) {
		this.fontName = fontName;
		this.fontColor = fontColor;
		this.fontSize = fontSize;
	}
};
