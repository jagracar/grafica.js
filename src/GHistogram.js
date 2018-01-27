/*
 * Histogram class.
 */
function GHistogram(parent, type, dim, plotPoints) {
	// The parent processing object
	this.parent = parent;

	// General properties
	this.type = (type === GPlot.VERTICAL || type === GPlot.HORIZONTAL) ? type : GPlot.VERTICAL;
	this.dim = dim.slice();
	this.plotPoints = [];

	// Copy the plot points
	for (var i = 0; i < plotPoints.length; i++) {
		this.plotPoints[i] = new GPoint(plotPoints[i]);
	}

	this.visible = true;
	this.separations = [2];
	this.bgColors = [this.parent.color(150, 150, 255)];
	this.lineColors = [this.parent.color(100, 100, 255)];
	this.lineWidths = [1];
	this.differences = [];
	this.leftSides = [];
	this.rightSides = [];
	this.updateArrays();

	// Labels properties
	this.labelsOffset = 8;
	this.drawLabels = false;
	this.rotateLabels = false;
	this.fontName = "Helvetica";
	this.fontColor = this.parent.color(0);
	this.fontSize = 11;
}

GHistogram.prototype.updateArrays = function() {
	var i;
	var nPoints = this.plotPoints.length;

	// Remove unused points
	if (this.differences.length > nPoints) {
		this.differences.splice(nPoints, Number.MAX_VALUE);
		this.leftSides.splice(nPoints, Number.MAX_VALUE);
		this.rightSides.splice(nPoints, Number.MAX_VALUE);
	}

	// Update the arrays
	if (nPoints === 1) {
		this.leftSides[0] = (this.type === GPlot.VERTICAL) ? 0.2 * this.dim[0] : 0.2 * this.dim[1];
		this.rightSides[0] = this.leftSides[0];
	} else if (nPoints > 1) {
		// Calculate the differences between consecutive points
		for ( i = 0; i < nPoints - 1; i++) {
			if (this.plotPoints[i].isValid() && this.plotPoints[i + 1].isValid()) {
				var separation = this.separations[i % this.separations.length];
				var diff;

				if (this.type === GPlot.VERTICAL) {
					diff = this.plotPoints[i + 1].getX() - this.plotPoints[i].getX();
				} else {
					diff = this.plotPoints[i + 1].getY() - this.plotPoints[i].getY();
				}

				if (diff > 0) {
					this.differences[i] = (diff - separation) / 2;
				} else {
					this.differences[i] = (diff + separation) / 2;
				}
			} else {
				this.differences[i] = 0;
			}
		}

		// Fill the leftSides and rightSides arrays
		this.leftSides[0] = this.differences[0];
		this.rightSides[0] = this.differences[0];

		for ( i = 1; i < nPoints - 1; i++) {
			this.leftSides[i] = this.differences[i - 1];
			this.rightSides[i] = this.differences[i];
		}

		this.leftSides[nPoints - 1] = this.differences[nPoints - 2];
		this.rightSides[nPoints - 1] = this.differences[nPoints - 2];
	}
};

GHistogram.prototype.draw = function(plotBasePoint) {
	if (this.visible) {
		// Calculate the baseline for the histogram
		var baseline = 0;

		if (plotBasePoint.isValid()) {
			baseline = (this.type === GPlot.VERTICAL) ? plotBasePoint.getY() : plotBasePoint.getX();
		}

		// Draw the rectangles
		var point, x1, x2, y1, y2, lw;
		var nPoints = this.plotPoints.length;

		this.parent.push();
		this.parent.rectMode(this.parent.CORNERS);
		this.parent.strokeCap(this.parent.SQUARE);

		for (var i = 0; i < nPoints; i++) {
			point = this.plotPoints[i];

			if (point.isValid()) {
				// Obtain the corners
				if (this.type === GPlot.VERTICAL) {
					x1 = point.getX() - this.leftSides[i];
					x2 = point.getX() + this.rightSides[i];
					y1 = point.getY();
					y2 = baseline;
				} else {
					x1 = baseline;
					x2 = point.getX();
					y1 = point.getY() - this.leftSides[i];
					y2 = point.getY() + this.rightSides[i];
				}

				if (x1 < 0) {
					x1 = 0;
				} else if (x1 > this.dim[0]) {
					x1 = this.dim[0];
				}

				if (-y1 < 0) {
					y1 = 0;
				} else if (-y1 > this.dim[1]) {
					y1 = -this.dim[1];
				}

				if (x2 < 0) {
					x2 = 0;
				} else if (x2 > this.dim[0]) {
					x2 = this.dim[0];
				}

				if (-y2 < 0) {
					y2 = 0;
				} else if (-y2 > this.dim[1]) {
					y2 = -this.dim[1];
				}

				// Draw the rectangle
				lw = this.lineWidths[i % this.lineWidths.length];
				this.parent.fill(this.bgColors[i % this.bgColors.length]);
				this.parent.stroke(this.lineColors[i % this.lineColors.length]);
				this.parent.strokeWeight(lw);

				if (Math.abs(x2 - x1) > 2 * lw && Math.abs(y2 - y1) > 2 * lw) {
					this.parent.rect(x1, y1, x2, y2);
				} else if ((this.type === GPlot.VERTICAL && x2 !== x1 && !(y1 === y2 && (y1 === 0 || y1 === -this.dim[1]))) || (this.type === GPlot.HORIZONTAL && y2 !== y1 && !(x1 === x2 && (x1 === 0 || x1 === this.dim[0])))) {
					this.parent.rect(x1, y1, x2, y2);
					this.parent.line(x1, y1, x1, y2);
					this.parent.line(x2, y1, x2, y2);
					this.parent.line(x1, y1, x2, y1);
					this.parent.line(x1, y2, x2, y2);
				}
			}
		}

		this.parent.pop();

		// Draw the labels
		if (this.drawLabels) {
			this.drawHistLabels();
		}
	}
};

GHistogram.prototype.drawHistLabels = function() {
	var point, i;
	var nPoints = this.plotPoints.length;
	var halfPI = 0.5 * Math.PI;

	this.parent.push();
	this.parent.textFont(this.fontName);
	this.parent.textSize(this.fontSize);
	this.parent.fill(this.fontColor);
	this.parent.noStroke();

	if (this.type === GPlot.VERTICAL) {
		if (this.rotateLabels) {
			this.parent.textAlign(this.parent.RIGHT, this.parent.CENTER);

			for ( i = 0; i < nPoints; i++) {
				point = this.plotPoints[i];

				if (point.isValid() && point.getX() >= 0 && point.getX() <= this.dim[0]) {
					this.parent.push();
					this.parent.translate(point.getX(), this.labelsOffset);
					this.parent.rotate(-halfPI);
					this.parent.text(point.getLabel(), 0, 0);
					this.parent.pop();
				}
			}
		} else {
			this.parent.textAlign(this.parent.CENTER, this.parent.TOP);

			for ( i = 0; i < nPoints; i++) {
				point = this.plotPoints[i];

				if (point.isValid() && point.getX() >= 0 && point.getX() <= this.dim[0]) {
					this.parent.text(point.getLabel(), point.getX(), this.labelsOffset);
				}
			}
		}
	} else {
		if (this.rotateLabels) {
			this.parent.textAlign(this.parent.CENTER, this.parent.BOTTOM);

			for ( i = 0; i < nPoints; i++) {
				point = this.plotPoints[i];

				if (point.isValid() && -point.getY() >= 0 && -point.getY() <= this.dim[1]) {
					this.parent.push();
					this.parent.translate(-this.labelsOffset, point.getY());
					this.parent.rotate(-halfPI);
					this.parent.text(point.getLabel(), 0, 0);
					this.parent.pop();
				}
			}
		} else {
			this.parent.textAlign(this.parent.RIGHT, this.parent.CENTER);

			for ( i = 0; i < nPoints; i++) {
				point = this.plotPoints[i];

				if (point.isValid() && -point.getY() >= 0 && -point.getY() <= this.dim[1]) {
					this.parent.text(point.getLabel(), -this.labelsOffset, point.getY());
				}
			}
		}
	}

	this.parent.pop();
};

GHistogram.prototype.setType = function(type) {
	if (type !== this.type && (type === GPlot.VERTICAL || type === GPlot.HORIZONTAL)) {
		this.type = type;
		this.updateArrays();
	}
};

GHistogram.prototype.setDim = function() {
	var xDim, yDim;

	if (arguments.length === 2) {
		xDim = arguments[0];
		yDim = arguments[1];
	} else if (arguments.length === 1) {
		xDim = arguments[0][0];
		yDim = arguments[0][1];
	} else {
		throw new Error("GHistogram.setDim(): signature not supported");
	}

	if (xDim > 0 && yDim > 0) {
		this.dim[0] = xDim;
		this.dim[1] = yDim;
		this.updateArrays();
	}
};

GHistogram.prototype.setPlotPoints = function(plotPoints) {
	var i;
	var nPoints = plotPoints.length;

	if (this.plotPoints.length === nPoints) {
		for ( i = 0; i < nPoints; i++) {
			this.plotPoints[i].set(plotPoints[i]);
		}
	} else if (this.plotPoints.length > nPoints) {
		for ( i = 0; i < nPoints; i++) {
			this.plotPoints[i].set(plotPoints[i]);
		}

		this.plotPoints.splice(nPoints, Number.MAX_VALUE);
	} else {
		for ( i = 0; i < this.plotPoints.length; i++) {
			this.plotPoints[i].set(plotPoints[i]);
		}

		for ( i = this.plotPoints.length; i < nPoints; i++) {
			this.plotPoints[i] = new GPoint(plotPoints[i]);
		}
	}

	this.updateArrays();
};

GHistogram.prototype.setPlotPoint = function(index, plotPoint) {
	if (index < this.plotPoints.length) {
		this.plotPoints[index].set(plotPoint);
	} else if (index === this.plotPoints.length) {
		this.plotPoints[index] = new GPoint(plotPoint);
	} else {
		throw new Error("GHistogram.setPlotPoint(): the index position is outside the array size");
	}

	this.updateArrays();
};

GHistogram.prototype.addPlotPoint = function() {
	if (arguments.length === 2) {
		this.plotPoints.push(new GPoint(arguments[0], arguments[1]));
	} else if (arguments.length === 1) {
		this.plotPoints.push(new GPoint(arguments[0]));
	} else {
		throw new Error("GHistogram.addPlotPoint(): signature not supported");
	}

	this.updateArrays();
};

GHistogram.prototype.removePlotPoint = function(index) {
	if (index < this.plotPoints.length) {
		this.plotPoints.splice(index, 1);
	} else {
		throw new Error("GHistogram.removePlotPoint(): the index position is outside the array size");
	}

	this.updateArrays();
};

GHistogram.prototype.setSeparations = function(separations) {
	this.separations = separations.slice();
	this.updateArrays();
};

GHistogram.prototype.setBgColors = function(bgColors) {
	this.bgColors = bgColors.slice();
};

GHistogram.prototype.setLineColors = function(lineColors) {
	this.lineColors = lineColors.slice();
};

GHistogram.prototype.setLineWidths = function(lineWidths) {
	this.lineWidths = lineWidths.slice();
};

GHistogram.prototype.setVisible = function(visible) {
	this.visible = visible;
};

GHistogram.prototype.setLabelsOffset = function(labelsOffset) {
	this.labelsOffset = labelsOffset;
};

GHistogram.prototype.setDrawLabels = function(drawLabels) {
	this.drawLabels = drawLabels;
};

GHistogram.prototype.setRotateLabels = function(rotateLabels) {
	this.rotateLabels = rotateLabels;
};

GHistogram.prototype.setFontName = function(fontName) {
	this.fontName = fontName;
};

GHistogram.prototype.setFontColor = function(fontColor) {
	this.fontColor = fontColor;
};

GHistogram.prototype.setFontSize = function(fontSize) {
	if (fontSize > 0) {
		this.fontSize = fontSize;
	}
};

GHistogram.prototype.setFontProperties = function(fontName, fontColor, fontSize) {
	if (fontSize > 0) {
		this.fontName = fontName;
		this.fontColor = fontColor;
		this.fontSize = fontSize;
	}
};
