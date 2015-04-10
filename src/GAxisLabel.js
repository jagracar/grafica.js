/*
 * Axis label class.
 */
function GAxisLabel(parent, type, dim) {
	// The parent processing object
	this.parent = parent;

	// General properties
	this.type = (type === this.parent.BOTTOM || type === this.parent.TOP || type === this.parent.LEFT || type === this.parent.RIGHT) ? type : this.parent.BOTTOM;
	this.dim = dim.slice();
	this.relativePos = 0.5;
	this.plotPos = (this.type === this.parent.BOTTOM || this.type === this.parent.TOP) ? this.relativePos * this.dim[0] : -this.relativePos * this.dim[1];
	this.offset = 35;
	this.rotate = (this.type === this.parent.BOTTOM || this.type === this.parent.TOP) ? false : true;

	// Text properties
	this.text = "";
	this.textAlignment = this.parent.CENTER;
	this.fontName = "Helvetica";
	this.fontColor = this.parent.color(0);
	this.fontSize = 13;
}

GAxisLabel.prototype.draw = function() {
	switch (this.type) {
	case this.parent.BOTTOM:
		this.drawAsXLabel();
		break;
	case this.parent.LEFT:
		this.drawAsYLabel();
		break;
	case this.parent.TOP:
		this.drawAsTopLabel();
		break;
	case this.parent.RIGHT:
		this.drawAsRightLabel();
		break;
	}
};

GAxisLabel.prototype.drawAsXLabel = function() {
	this.parent.push();
	this.parent.textFont(this.fontName);
	this.parent.textSize(this.fontSize);
	this.parent.fill(this.fontColor);
	this.parent.noStroke();

	if (this.rotate) {
		this.parent.textAlign(this.parent.RIGHT, this.parent.CENTER);
		this.parent.translate(this.plotPos, this.offset);
		this.parent.rotate(-0.5 * Math.PI);
		this.parent.text(this.text, 0, 0);
	} else {
		this.parent.textAlign(this.textAlignment, this.parent.TOP);
		this.parent.text(this.text, this.plotPos, this.offset);
	}

	this.parent.pop();
};

GAxisLabel.prototype.drawAsYLabel = function() {
	this.parent.push();
	this.parent.textFont(this.fontName);
	this.parent.textSize(this.fontSize);
	this.parent.fill(this.fontColor);
	this.parent.noStroke();

	if (this.rotate) {
		this.parent.textAlign(this.textAlignment, this.parent.BOTTOM);
		this.parent.translate(-this.offset, this.plotPos);
		this.parent.rotate(-0.5 * Math.PI);
		this.parent.text(this.text, 0, 0);
	} else {
		this.parent.textAlign(this.parent.RIGHT, this.parent.CENTER);
		this.parent.text(this.text, -this.offset, this.plotPos);
	}

	this.parent.pop();
};

GAxisLabel.prototype.drawAsTopLabel = function() {
	this.parent.push();
	this.parent.textFont(this.fontName);
	this.parent.textSize(this.fontSize);
	this.parent.fill(this.fontColor);
	this.parent.noStroke();

	if (this.rotate) {
		this.parent.textAlign(this.parent.LEFT, this.parent.CENTER);
		this.parent.translate(this.plotPos, -this.offset - this.dim[1]);
		this.parent.rotate(-0.5 * Math.PI);
		this.parent.text(this.text, 0, 0);
	} else {
		this.parent.textAlign(this.textAlignment, this.parent.BOTTOM);
		this.parent.text(this.text, this.plotPos, -this.offset - this.dim[1]);
	}

	this.parent.pop();
};

GAxisLabel.prototype.drawAsRightLabel = function() {
	this.parent.push();
	this.parent.textFont(this.fontName);
	this.parent.textSize(this.fontSize);
	this.parent.fill(this.fontColor);
	this.parent.noStroke();

	if (this.rotate) {
		this.parent.textAlign(this.textAlignment, this.parent.TOP);
		this.parent.translate(this.offset + this.dim[0], this.plotPos);
		this.parent.rotate(-0.5 * Math.PI);
		this.parent.text(this.text, 0, 0);
	} else {
		this.parent.textAlign(this.parent.LEFT, this.parent.CENTER);
		this.parent.text(this.text, this.offset + this.dim[0], this.plotPos);
	}

	this.parent.pop();
};

GAxisLabel.prototype.setDim = function() {
	var xDim, yDim;

	if (arguments.length === 2) {
		xDim = arguments[0];
		yDim = arguments[1];
	} else if (arguments.length === 1) {
		xDim = arguments[0][0];
		yDim = arguments[0][1];
	} else {
		throw new Error("GAxisLabel.setDim(): signature not supported");
	}

	if (xDim > 0 && yDim > 0) {
		this.dim[0] = xDim;
		this.dim[1] = yDim;
		this.plotPos = (this.type === this.parent.BOTTOM || this.type === this.parent.TOP) ? this.relativePos * this.dim[0] : -this.relativePos * this.dim[1];
	}
};

GAxisLabel.prototype.setRelativePos = function(relativePos) {
	this.relativePos = relativePos;
	this.plotPos = (this.type === this.parent.BOTTOM || this.type === this.parent.TOP) ? this.relativePos * this.dim[0] : -this.relativePos * this.dim[1];
};

GAxisLabel.prototype.setOffset = function(offset) {
	this.offset = offset;
};

GAxisLabel.prototype.setRotate = function(rotate) {
	this.rotate = rotate;
};

GAxisLabel.prototype.setText = function(text) {
	this.text = text;
};

GAxisLabel.prototype.setTextAlignment = function(textAlignment) {
	if (textAlignment === this.parent.CENTER || textAlignment === this.parent.LEFT || textAlignment === this.parent.RIGHT) {
		this.textAlignment = textAlignment;
	}
};

GAxisLabel.prototype.setFontName = function(fontName) {
	this.fontName = fontName;
};

GAxisLabel.prototype.setFontColor = function(fontColor) {
	this.fontColor = fontColor;
};

GAxisLabel.prototype.setFontSize = function(fontSize) {
	if (fontSize > 0) {
		this.fontSize = fontSize;
	}
};

GAxisLabel.prototype.setFontProperties = function(fontName, fontColor, fontSize) {
	if (fontSize > 0) {
		this.fontName = fontName;
		this.fontColor = fontColor;
		this.fontSize = fontSize;
	}
};
