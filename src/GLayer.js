/*
 * Layer class. A GLayer usually contains an array of points and a histogram
 */
function GLayer(parent, id, dim, xLim, yLim, xLog, yLog) {
	// The parent processing object
	this.parent = parent;

	// General properties
	this.id = id;
	this.dim = dim.slice();
	this.xLim = xLim.slice();
	this.yLim = yLim.slice();
	this.xLog = xLog;
	this.yLog = yLog;

	// Do some sanity checks
	if (this.xLog && (this.xLim[0] <= 0 || this.xLim[1] <= 0)) {
		console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		console.log("Will set horizontal limits to (0.1, 10)");
		this.xLim[0] = 0.1;
		this.xLim[1] = 10;
	}

	if (this.yLog && (this.yLim[0] <= 0 || this.yLim[1] <= 0)) {
		console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		console.log("Will set vertical limits to (0.1, 10)");
		this.yLim[0] = 0.1;
		this.yLim[1] = 10;
	}

	// Points properties
	this.points = [];
	this.plotPoints = [];
	this.inside = [];
	this.pointColors = [this.parent.color(255, 0, 0, 150)];
	this.pointSizes = [7];

	// Line properties
	this.lineColor = this.parent.color(0, 150);
	this.lineWidth = 1;

	// Histogram properties
	this.hist = undefined;
	this.histBasePoint = new GPoint(0, 0);

	// Labels properties
	this.labelBgColor = this.parent.color(255, 200);
	this.labelSeparation = [7, 7];
	this.fontName = "Helvetica";
	this.fontColor = this.parent.color(0);
	this.fontSize = 11;

	// Helper variable
	this.cuts = [[0, 0], [0, 0], [0, 0], [0, 0]];
}

GLayer.prototype.isValidNumber = function(number) {
	return !isNaN(number) && isFinite(number);
};

GLayer.prototype.isId = function(someId) {
	return this.id === someId;
};

GLayer.prototype.valueToXPlot = function(x) {
	if (this.xLog) {
		return this.dim[0] * Math.log(x / this.xLim[0]) / Math.log(this.xLim[1] / this.xLim[0]);
	} else {
		return this.dim[0] * (x - this.xLim[0]) / (this.xLim[1] - this.xLim[0]);
	}
};

GLayer.prototype.valueToYPlot = function(y) {
	if (this.yLog) {
		return -this.dim[1] * Math.log(y / this.yLim[0]) / Math.log(this.yLim[1] / this.yLim[0]);
	} else {
		return -this.dim[1] * (y - this.yLim[0]) / (this.yLim[1] - this.yLim[0]);
	}
};

GLayer.prototype.valueToPlot = function() {
	if (arguments.length === 2) {
		return [this.valueToXPlot(arguments[0]), this.valueToYPlot(arguments[1])];
	} else if (arguments.length === 1 && arguments[0] instanceof GPoint) {
		return new GPoint(this.valueToXPlot(arguments[0].getX()), this.valueToYPlot(arguments[0].getY()), arguments[0].getLabel());
	} else if (arguments.length === 1 && arguments[0] instanceof Array && arguments[0][0] instanceof GPoint) {
		var xScalingFactor, yScalingFactor, point, xPlot, yPlot, i;
		var nPoints = arguments[0].length;
		var plotPts = [];

		// Go case by case. More code, but it's faster
		if (this.xLog && this.yLog) {
			xScalingFactor = this.dim[0] / Math.log(this.xLim[1] / this.xLim[0]);
			yScalingFactor = -this.dim[1] / Math.log(this.yLim[1] / this.yLim[0]);

			for ( i = 0; i < nPoints; i++) {
				point = arguments[0][i];
				xPlot = Math.log(point.getX() / this.xLim[0]) * xScalingFactor;
				yPlot = Math.log(point.getY() / this.yLim[0]) * yScalingFactor;
				plotPts[i] = new GPoint(xPlot, yPlot, point.getLabel());
			}
		} else if (this.xLog) {
			xScalingFactor = this.dim[0] / Math.log(this.xLim[1] / this.xLim[0]);
			yScalingFactor = -this.dim[1] / (this.yLim[1] - this.yLim[0]);

			for ( i = 0; i < nPoints; i++) {
				point = arguments[0][i];
				xPlot = Math.log(point.getX() / this.xLim[0]) * xScalingFactor;
				yPlot = (point.getY() - this.yLim[0]) * yScalingFactor;
				plotPts[i] = new GPoint(xPlot, yPlot, point.getLabel());
			}
		} else if (this.yLog) {
			xScalingFactor = this.dim[0] / (this.xLim[1] - this.xLim[0]);
			yScalingFactor = -this.dim[1] / Math.log(this.yLim[1] / this.yLim[0]);

			for ( i = 0; i < nPoints; i++) {
				point = arguments[0][i];
				xPlot = (point.getX() - this.xLim[0]) * xScalingFactor;
				yPlot = Math.log(point.getY() / this.yLim[0]) * yScalingFactor;
				plotPts[i] = new GPoint(xPlot, yPlot, point.getLabel());
			}
		} else {
			xScalingFactor = this.dim[0] / (this.xLim[1] - this.xLim[0]);
			yScalingFactor = -this.dim[1] / (this.yLim[1] - this.yLim[0]);

			for ( i = 0; i < nPoints; i++) {
				point = arguments[0][i];
				xPlot = (point.getX() - this.xLim[0]) * xScalingFactor;
				yPlot = (point.getY() - this.yLim[0]) * yScalingFactor;
				plotPts[i] = new GPoint(xPlot, yPlot, point.getLabel());
			}
		}

		return plotPts;
	} else {
		throw new Error("GLayer.valueToPlot(): signature not supported");
	}
};

GLayer.prototype.updatePlotPoints = function() {
	var xScalingFactor, yScalingFactor, point, xPlot, yPlot, i;
	var nPoints = this.points.length;

	// Update the plotPoints array size if necessary
	if (this.plotPoints.length < nPoints) {
		for ( i = this.plotPoints.length; i < nPoints; i++) {
			this.plotPoints[i] = new GPoint();
		}
	} else if (this.plotPoints.length > nPoints) {
		this.plotPoints.splice(nPoints, Number.MAX_VALUE);
	}

	// Go case by case. More code, but it should be faster
	if (this.xLog && this.yLog) {
		xScalingFactor = this.dim[0] / Math.log(this.xLim[1] / this.xLim[0]);
		yScalingFactor = -this.dim[1] / Math.log(this.yLim[1] / this.yLim[0]);

		for ( i = 0; i < nPoints; i++) {
			point = this.points[i];
			xPlot = Math.log(point.getX() / this.xLim[0]) * xScalingFactor;
			yPlot = Math.log(point.getY() / this.yLim[0]) * yScalingFactor;
			this.plotPoints[i].set(xPlot, yPlot, point.getLabel());
		}
	} else if (this.xLog) {
		xScalingFactor = this.dim[0] / Math.log(this.xLim[1] / this.xLim[0]);
		yScalingFactor = -this.dim[1] / (this.yLim[1] - this.yLim[0]);

		for ( i = 0; i < nPoints; i++) {
			point = this.points[i];
			xPlot = Math.log(point.getX() / this.xLim[0]) * xScalingFactor;
			yPlot = (point.getY() - this.yLim[0]) * yScalingFactor;
			this.plotPoints[i].set(xPlot, yPlot, point.getLabel());
		}
	} else if (this.yLog) {
		xScalingFactor = this.dim[0] / (this.xLim[1] - this.xLim[0]);
		yScalingFactor = -this.dim[1] / Math.log(this.yLim[1] / this.yLim[0]);

		for ( i = 0; i < nPoints; i++) {
			point = this.points[i];
			xPlot = (point.getX() - this.xLim[0]) * xScalingFactor;
			yPlot = Math.log(point.getY() / this.yLim[0]) * yScalingFactor;
			this.plotPoints[i].set(xPlot, yPlot, point.getLabel());
		}
	} else {
		xScalingFactor = this.dim[0] / (this.xLim[1] - this.xLim[0]);
		yScalingFactor = -this.dim[1] / (this.yLim[1] - this.yLim[0]);

		for ( i = 0; i < nPoints; i++) {
			point = this.points[i];
			xPlot = (point.getX() - this.xLim[0]) * xScalingFactor;
			yPlot = (point.getY() - this.yLim[0]) * yScalingFactor;
			this.plotPoints[i].set(xPlot, yPlot, point.getLabel());
		}
	}
};

GLayer.prototype.xPlotToValue = function(xPlot) {
	if (this.xLog) {
		return Math.exp(Math.log(this.xLim[0]) + Math.log(this.xLim[1] / this.xLim[0]) * xPlot / this.dim[0]);
	} else {
		return this.xLim[0] + (this.xLim[1] - this.xLim[0]) * xPlot / this.dim[0];
	}
};

GLayer.prototype.yPlotToValue = function(yPlot) {
	if (this.yLog) {
		return Math.exp(Math.log(this.yLim[0]) - Math.log(this.yLim[1] / this.yLim[0]) * yPlot / this.dim[1]);
	} else {
		return this.yLim[0] - (this.yLim[1] - this.yLim[0]) * yPlot / this.dim[1];
	}
};

GLayer.prototype.plotToValue = function(xPlot, yPlot) {
	return [this.xPlotToValue(xPlot), this.yPlotToValue(yPlot)];
};

GLayer.prototype.isInside = function() {
	var xPlot, yPlot, valid;

	if (arguments.length === 2) {
		xPlot = arguments[0];
		yPlot = arguments[1];
		valid = this.isValidNumber(xPlot) && this.isValidNumber(yPlot);
	} else if (arguments.length === 1 && arguments[0] instanceof GPoint) {
		xPlot = arguments[0].getX();
		yPlot = arguments[0].getY();
		valid = arguments[0].isValid();
	} else {
		throw new Error("GLayer.isInside(): signature not supported");
	}

	return (valid) ? (xPlot >= 0) && (xPlot <= this.dim[0]) && (-yPlot >= 0) && (-yPlot <= this.dim[1]) : false;
};

GLayer.prototype.updateInsideList = function() {
	var point;
	var nPoints = this.plotPoints.length;

	for (var i = 0; i < nPoints; i++) {
		point = this.plotPoints[i];
		this.inside[i] = (point.isValid()) ? (point.getX() >= 0) && (point.getX() <= this.dim[0]) && (-point.getY() >= 0) && (-point.getY() <= this.dim[1]) : false;
	}

	// Remove the unused elements
	if (this.inside.length > nPoints) {
		this.inside.splice(nPoints, Number.MAX_VALUE);
	}
};

GLayer.prototype.getPointIndexAtPlotPos = function(xPlot, yPlot) {
	var pointIndex;

	if (this.isInside(xPlot, yPlot)) {
		var point, distSq;
		var minDistSq = Number.MAX_VALUE;
		var nPoints = this.plotPoints.length;
		var nSizes = this.pointSizes.length;

		for (var i = 0; i < nPoints; i++) {
			if (this.inside[i]) {
				point = this.plotPoints[i];
				distSq = Math.pow(point.getX() - xPlot, 2) + Math.pow(point.getY() - yPlot, 2);

				if (distSq < Math.max(Math.pow(this.pointSizes[i % nSizes] / 2.0, 2), 25)) {
					if (distSq < minDistSq) {
						minDistSq = distSq;
						pointIndex = i;
					}
				}
			}
		}
	}

	return pointIndex;
};

GLayer.prototype.getPointAtPlotPos = function(xPlot, yPlot) {
	return this.points[this.getPointIndexAtPlotPos(xPlot, yPlot)];
};

GLayer.prototype.obtainBoxIntersections = function(plotPoint1, plotPoint2) {
	var nCuts = 0;

	if (plotPoint1.isValid() && plotPoint2.isValid()) {
		var x1 = plotPoint1.getX();
		var y1 = plotPoint1.getY();
		var x2 = plotPoint2.getX();
		var y2 = plotPoint2.getY();
		var inside1 = this.isInside(x1, y1);
		var inside2 = this.isInside(x2, y2);

		// Check if the line between the two points could cut the box borders
		var dontCut = (inside1 && inside2) || (x1 < 0 && x2 < 0) || (x1 > this.dim[0] && x2 > this.dim[0]) || (-y1 < 0 && -y2 < 0) || (-y1 > this.dim[1] && -y2 > this.dim[1]);

		if (!dontCut) {
			// Obtain the axis cuts of the line that cross the two points
			var deltaX = x2 - x1;
			var deltaY = y2 - y1;

			if (deltaX === 0) {
				nCuts = 2;
				this.cuts[0][0] = x1;
				this.cuts[0][1] = 0;
				this.cuts[1][0] = x1;
				this.cuts[1][1] = -this.dim[1];
			} else if (deltaY === 0) {
				nCuts = 2;
				this.cuts[0][0] = 0;
				this.cuts[0][1] = y1;
				this.cuts[1][0] = this.dim[0];
				this.cuts[1][1] = y1;
			} else {
				// Obtain the straight line (y = yCut + slope*x) that
				// crosses the two points
				var slope = deltaY / deltaX;
				var yCut = y1 - slope * x1;

				// Calculate the axis cuts of that line
				nCuts = 4;
				this.cuts[0][0] = -yCut / slope;
				this.cuts[0][1] = 0;
				this.cuts[1][0] = (-this.dim[1] - yCut) / slope;
				this.cuts[1][1] = -this.dim[1];
				this.cuts[2][0] = 0;
				this.cuts[2][1] = yCut;
				this.cuts[3][0] = this.dim[0];
				this.cuts[3][1] = yCut + slope * this.dim[0];
			}

			// Select only the cuts that fall inside the box and are located
			// between the two points
			nCuts = this.getValidCuts(this.cuts, nCuts, plotPoint1, plotPoint2);

			// Make sure we have the correct number of cuts
			if (inside1 || inside2) {
				// One of the points is inside. We should have one cut only
				if (nCuts !== 1) {
					var pointInside = (inside1) ? plotPoint1 : plotPoint2;

					// If too many cuts
					if (nCuts > 1) {
						nCuts = this.removeDuplicatedCuts(this.cuts, nCuts, 0);

						if (nCuts > 1) {
							nCuts = this.removePointFromCuts(this.cuts, nCuts, pointInside, 0);

							// In case of rounding number errors
							if (nCuts > 1) {
								nCuts = this.removeDuplicatedCuts(this.cuts, nCuts, 0.001);

								if (nCuts > 1) {
									nCuts = this.removePointFromCuts(this.cuts, nCuts, pointInside, 0.001);
								}
							}
						}
					}

					// If the cut is missing, then it must be equal to the point
					// inside
					if (nCuts === 0) {
						nCuts = 1;
						this.cuts[0][0] = pointInside.getX();
						this.cuts[0][1] = pointInside.getY();
					}
				}
			} else {
				// Both points are outside. We should have either two cuts or
				// none
				if (nCuts > 2) {
					nCuts = this.removeDuplicatedCuts(this.cuts, nCuts, 0);

					// In case of rounding number errors
					if (nCuts > 2) {
						nCuts = this.removeDuplicatedCuts(this.cuts, nCuts, 0.001);
					}
				}

				// If we have two cuts, order them (the closest to the first
				// point goes first)
				if (nCuts === 2) {
					if ((Math.pow(this.cuts[0][0] - x1, 2) + Math.pow(this.cuts[0][1] - y1), 2) > (Math.pow(this.cuts[1][0] - x1, 2) + Math.pow(this.cuts[1][1] - y1, 2))) {
						this.cuts[2][0] = this.cuts[0][0];
						this.cuts[2][1] = this.cuts[0][1];
						this.cuts[0][0] = this.cuts[1][0];
						this.cuts[0][1] = this.cuts[1][1];
						this.cuts[1][0] = this.cuts[2][0];
						this.cuts[1][1] = this.cuts[2][1];
					}
				}

				// If one cut is missing, add the same one twice
				if (nCuts === 1) {
					nCuts = 2;
					this.cuts[1][0] = this.cuts[0][0];
					this.cuts[1][1] = this.cuts[0][1];
				}
			}

			// Some sanity checks
			if ((inside1 || inside2) && nCuts !== 1) {
				console.log("There should be one cut!!!");
			} else if (!inside1 && !inside2 && nCuts !== 0 && nCuts !== 2) {
				console.log("There should be either 0 or 2 cuts!!! " + nCuts + " were found");
			}
		}
	}

	return nCuts;
};

GLayer.prototype.getValidCuts = function(cuts, nCuts, plotPoint1, plotPoint2) {
	var x1 = plotPoint1.getX();
	var y1 = plotPoint1.getY();
	var x2 = plotPoint2.getX();
	var y2 = plotPoint2.getY();
	var deltaX = Math.abs(x2 - x1);
	var deltaY = Math.abs(y2 - y1);
	var counter = 0;

	for (var i = 0; i < nCuts; i++) {
		// Check that the cut is inside the inner plotting area
		if (this.isInside(cuts[i][0], cuts[i][1])) {
			// Check that the cut falls between the two points
			if (Math.abs(cuts[i][0] - x1) <= deltaX && Math.abs(cuts[i][1] - y1) <= deltaY && Math.abs(cuts[i][0] - x2) <= deltaX && Math.abs(cuts[i][1] - y2) <= deltaY) {
				cuts[counter][0] = cuts[i][0];
				cuts[counter][1] = cuts[i][1];
				counter++;
			}
		}
	}

	return counter;
};

GLayer.prototype.removeDuplicatedCuts = function(cuts, nCuts, tolerance) {
	var repeated;
	var counter = 0;

	for (var i = 0; i < nCuts; i++) {
		repeated = false;

		for (var j = 0; j < counter; j++) {
			if (Math.abs(cuts[j][0] - cuts[i][0]) <= tolerance && Math.abs(cuts[j][1] - cuts[i][1]) <= tolerance) {
				repeated = true;
				break;
			}
		}

		if (!repeated) {
			cuts[counter][0] = cuts[i][0];
			cuts[counter][1] = cuts[i][1];
			counter++;
		}
	}

	return counter;
};

GLayer.prototype.removePointFromCuts = function(cuts, nCuts, plotPoint, tolerance) {
	var x = plotPoint.getX();
	var y = plotPoint.getY();
	var counter = 0;

	for (var i = 0; i < nCuts; i++) {
		if (Math.abs(cuts[i][0] - x) > tolerance || Math.abs(cuts[i][1] - y) > tolerance) {
			cuts[counter][0] = cuts[i][0];
			cuts[counter][1] = cuts[i][1];
			counter++;
		}
	}

	return counter;
};

GLayer.prototype.startHistogram = function(histType) {
	this.hist = new GHistogram(this.parent, histType, this.dim, this.plotPoints);
};

GLayer.prototype.drawPoints = function() {
	var nPoints, i;

	if (arguments.length === 0) {
		nPoints = this.plotPoints.length;
		var nColors = this.pointColors.length;
		var nSizes = this.pointSizes.length;

		this.parent.push();
		this.parent.ellipseMode(this.parent.CENTER);
		this.parent.noStroke();

		if (nColors === 1 && nSizes === 1) {
			this.parent.fill(this.pointColors[0]);

			for ( i = 0; i < nPoints; i++) {
				if (this.inside[i]) {
					this.parent.ellipse(this.plotPoints[i].getX(), this.plotPoints[i].getY(), this.pointSizes[0], this.pointSizes[0]);
				}
			}
		} else if (nColors === 1) {
			this.parent.fill(this.pointColors[0]);

			for ( i = 0; i < nPoints; i++) {
				if (this.inside[i]) {
					this.parent.ellipse(this.plotPoints[i].getX(), this.plotPoints[i].getY(), this.pointSizes[i % nSizes], this.pointSizes[i % nSizes]);
				}
			}
		} else if (nSizes === 1) {
			for ( i = 0; i < nPoints; i++) {
				if (this.inside[i]) {
					this.parent.fill(this.pointColors[i % nColors]);
					this.parent.ellipse(this.plotPoints[i].getX(), this.plotPoints[i].getY(), this.pointSizes[0], this.pointSizes[0]);
				}
			}
		} else {
			for ( i = 0; i < nPoints; i++) {
				if (this.inside[i]) {
					this.parent.fill(this.pointColors[i % nColors]);
					this.parent.ellipse(this.plotPoints[i].getX(), this.plotPoints[i].getY(), this.pointSizes[i % nSizes], this.pointSizes[i % nSizes]);
				}
			}
		}

		this.parent.pop();
	} else if (arguments.length === 1 && arguments[0] instanceof p5.Image) {
		nPoints = this.plotPoints.length;

		this.parent.push();
		this.parent.imageMode(this.parent.CENTER);

		for ( i = 0; i < nPoints; i++) {
			if (this.inside[i]) {
				this.parent.image(arguments[0], this.plotPoints[i].getX(), this.plotPoints[i].getY());
			}
		}

		this.parent.pop();
	} else {
		throw new Error("GLayer.drawPoints(): signature not supported");
	}
};

GLayer.prototype.drawPoint = function() {
	var point, pointColor, pointSize, pointImg;

	if (arguments.length === 3) {
		point = arguments[0];
		pointColor = arguments[1];
		pointSize = arguments[2];
	} else if (arguments.length === 2 && arguments[1] instanceof p5.Image) {
		point = arguments[0];
		pointImg = arguments[1];
	} else if (arguments.length === 1) {
		point = arguments[0];
		pointColor = this.pointColors[0];
		pointSize = this.pointSizes[0];
	} else {
		throw new Error("GLayer.drawPoint(): signature not supported");
	}

	var xPlot = this.valueToXPlot(point.getX());
	var yPlot = this.valueToYPlot(point.getY());

	if (this.isInside(xPlot, yPlot)) {
		this.parent.push();

		if ( typeof pointImg !== "undefined") {
			this.parent.imageMode(this.parent.CENTER);
			this.parent.image(pointImg, xPlot, yPlot);
		} else {
			this.parent.ellipseMode(this.parent.CENTER);
			this.parent.fill(pointColor);
			this.parent.noStroke();
			this.parent.ellipse(xPlot, yPlot, pointSize, pointSize);
		}

		this.parent.pop();
	}
};

GLayer.prototype.drawLines = function() {
	var nPoints = this.plotPoints.length;

	this.parent.push();
	this.parent.noFill();
	this.parent.stroke(this.lineColor);
	this.parent.strokeWeight(this.lineWidth);
	this.parent.strokeCap(this.parent.SQUARE);

	for (var i = 0; i < nPoints - 1; i++) {
		if (this.inside[i] && this.inside[i + 1]) {
			this.parent.line(this.plotPoints[i].getX(), this.plotPoints[i].getY(), this.plotPoints[i + 1].getX(), this.plotPoints[i + 1].getY());
		} else if (this.plotPoints[i].isValid() && this.plotPoints[i + 1].isValid()) {
			// At least one of the points is outside the inner region.
			// Obtain the valid line box intersections
			var nCuts = this.obtainBoxIntersections(this.plotPoints[i], this.plotPoints[i + 1]);

			if (this.inside[i]) {
				this.parent.line(this.plotPoints[i].getX(), this.plotPoints[i].getY(), this.cuts[0][0], this.cuts[0][1]);
			} else if (this.inside[i + 1]) {
				this.parent.line(this.cuts[0][0], this.cuts[0][1], this.plotPoints[i + 1].getX(), this.plotPoints[i + 1].getY());
			} else if (nCuts >= 2) {
				this.parent.line(this.cuts[0][0], this.cuts[0][1], this.cuts[1][0], this.cuts[1][1]);
			}
		}
	}

	this.parent.pop();
};

GLayer.prototype.drawLine = function() {
	var point1, point2, lc, lw, slope, yCut;

	if (arguments.length === 4 && arguments[0] instanceof GPoint) {
		point1 = arguments[0];
		point2 = arguments[1];
		lc = arguments[2];
		lw = arguments[3];
	} else if (arguments.length === 4) {
		slope = arguments[0];
		yCut = arguments[1];
		lc = arguments[2];
		lw = arguments[3];
	} else if (arguments.length === 2 && arguments[0] instanceof GPoint) {
		point1 = arguments[0];
		point2 = arguments[1];
		lc = this.lineColor;
		lw = this.lineWidth;
	} else if (arguments.length === 2) {
		slope = arguments[0];
		yCut = arguments[1];
		lc = this.lineColor;
		lw = this.lineWidth;
	} else {
		throw new Error("GLayer.drawLine(): signature not supported");
	}

	if ( typeof slope !== "undefined") {
		if (this.xLog && this.yLog) {
			point1 = new GPoint(this.xLim[0], Math.pow(10, slope * Math.log(this.xLim[0]) / Math.LN10 + yCut));
			point2 = new GPoint(this.xLim[1], Math.pow(10, slope * Math.log(this.xLim[1]) / Math.LN10 + yCut));
		} else if (this.xLog) {
			point1 = new GPoint(this.xLim[0], slope * Math.log(this.xLim[0]) / Math.LN10 + yCut);
			point2 = new GPoint(this.xLim[1], slope * Math.log(this.xLim[1]) / Math.LN10 + yCut);
		} else if (this.yLog) {
			point1 = new GPoint(this.xLim[0], Math.pow(10, slope * this.xLim[0] + yCut));
			point2 = new GPoint(this.xLim[1], Math.pow(10, slope * this.xLim[1] + yCut));
		} else {
			point1 = new GPoint(this.xLim[0], slope * this.xLim[0] + yCut);
			point2 = new GPoint(this.xLim[1], slope * this.xLim[1] + yCut);
		}
	}

	var plotPoint1 = this.valueToPlot(point1);
	var plotPoint2 = this.valueToPlot(point2);

	if (plotPoint1.isValid() && plotPoint2.isValid()) {
		var inside1 = this.isInside(plotPoint1);
		var inside2 = this.isInside(plotPoint2);

		this.parent.push();
		this.parent.noFill();
		this.parent.stroke(lc);
		this.parent.strokeWeight(lw);
		this.parent.strokeCap(this.parent.SQUARE);

		if (inside1 && inside2) {
			this.parent.line(plotPoint1.getX(), plotPoint1.getY(), plotPoint2.getX(), plotPoint2.getY());
		} else {
			// At least one of the points is outside the inner region.
			// Obtain the valid line box intersections
			var nCuts = this.obtainBoxIntersections(plotPoint1, plotPoint2);

			if (inside1) {
				this.parent.line(plotPoint1.getX(), plotPoint1.getY(), this.cuts[0][0], this.cuts[0][1]);
			} else if (inside2) {
				this.parent.line(this.cuts[0][0], this.cuts[0][1], plotPoint2.getX(), plotPoint2.getY());
			} else if (nCuts >= 2) {
				this.parent.line(this.cuts[0][0], this.cuts[0][1], this.cuts[1][0], this.cuts[1][1]);
			}
		}

		this.parent.pop();
	}
};

GLayer.prototype.drawHorizontalLine = function() {
	var value, lc, lw;

	if (arguments.length === 3) {
		value = arguments[0];
		lc = arguments[1];
		lw = arguments[2];
	} else if (arguments.length === 1) {
		value = arguments[0];
		lc = this.lineColor;
		lw = this.lineWidth;
	} else {
		throw new Error("GLayer.drawHorizontalLine(): signature not supported");
	}

	var yPlot = this.valueToYPlot(value);

	if (this.isValidNumber(yPlot) && -yPlot >= 0 && -yPlot <= this.dim[1]) {
		this.parent.push();
		this.parent.noFill();
		this.parent.stroke(lc);
		this.parent.strokeWeight(lw);
		this.parent.strokeCap(this.parent.SQUARE);
		this.parent.line(0, yPlot, this.dim[0], yPlot);
		this.parent.pop();
	}
};

GLayer.prototype.drawVerticalLine = function() {
	var value, lc, lw;

	if (arguments.length === 3) {
		value = arguments[0];
		lc = arguments[1];
		lw = arguments[2];
	} else if (arguments.length === 1) {
		value = arguments[0];
		lc = this.lineColor;
		lw = this.lineWidth;
	} else {
		throw new Error("GLayer.drawVerticalLine(): signature not supported");
	}

	var xPlot = this.valueToXPlot(value);

	if (this.isValidNumber(xPlot) && xPlot >= 0 && xPlot <= this.dim[0]) {
		this.parent.push();
		this.parent.noFill();
		this.parent.stroke(lc);
		this.parent.strokeWeight(lw);
		this.parent.strokeCap(this.parent.SQUARE);
		this.parent.line(xPlot, 0, xPlot, -this.dim[1]);
		this.parent.pop();
	}
};

GLayer.prototype.drawFilledContour = function(contourType, referenceValue) {
	// Get the points that compose the shape
	var shapePoints;

	if (contourType === GPlot.HORIZONTAL) {
		shapePoints = this.getHorizontalShape(referenceValue);
	} else if (contourType === GPlot.VERTICAL) {
		shapePoints = this.getVerticalShape(referenceValue);
	}

	// Draw the shape
	if ( typeof shapePoints !== "undefined" && shapePoints.length > 0) {
		this.parent.push();
		this.parent.fill(this.lineColor);
		this.parent.noStroke();
		this.parent.beginShape();

		for (var i = 0; i < shapePoints.length; i++) {
			if (shapePoints[i].isValid()) {
				this.parent.vertex(shapePoints[i].getX(), shapePoints[i].getY());
			}
		}

		this.parent.endShape(this.parent.CLOSE);
		this.parent.pop();
	}
};

GLayer.prototype.getHorizontalShape = function(referenceValue) {
	// Collect the points and cuts inside the box
	var point, addedPoints, nextIndex;
	var nPoints = this.plotPoints.length;
	var shapePoints = [];
	var indexFirstPoint = -1;
	var indexLastPoint = -1;

	for (var i = 0; i < nPoints; i++) {
		point = this.plotPoints[i];

		if (point.isValid()) {
			addedPoints = false;

			// Add the point if it's inside the box
			if (this.inside[i]) {
				shapePoints.push(new GPoint(point.getX(), point.getY(), "normal point"));
				addedPoints = true;
			} else if (point.getX() >= 0 && point.getX() <= this.dim[0]) {
				// If it's outside, add the projection of the point on the
				// horizontal axes
				if (-point.getY() < 0) {
					shapePoints.push(new GPoint(point.getX(), 0, "projection"));
					addedPoints = true;
				} else {
					shapePoints.push(new GPoint(point.getX(), -this.dim[1], "projection"));
					addedPoints = true;
				}
			}

			// Add the box cuts if there is any
			nextIndex = i + 1;

			while (nextIndex < nPoints - 1 && !this.plotPoints[nextIndex].isValid()) {
				nextIndex++;
			}

			if (nextIndex < nPoints && this.plotPoints[nextIndex].isValid()) {
				var nCuts = this.obtainBoxIntersections(point, this.plotPoints[nextIndex]);

				for (var j = 0; j < nCuts; j++) {
					shapePoints.push(new GPoint(this.cuts[j][0], this.cuts[j][1], "cut"));
					addedPoints = true;
				}
			}

			if (addedPoints) {
				if (indexFirstPoint < 0) {
					indexFirstPoint = i;
				}

				indexLastPoint = i;
			}
		}
	}

	// Continue if there are points in the shape
	if (shapePoints.length > 0) {
		// Calculate the starting point
		var startPoint = new GPoint(shapePoints[0]);

		if (startPoint.getX() !== 0 && startPoint.getX() !== this.dim[0]) {
			if (startPoint.getLabel() === "cut") {
				if (this.plotPoints[indexFirstPoint].getX() < 0) {
					startPoint.setX(0);
					startPoint.setLabel("extreme");
				} else {
					startPoint.setX(this.dim[0]);
					startPoint.setLabel("extreme");
				}
			} else if (indexFirstPoint !== 0) {
				// Get the previous valid point
				var prevIndex = indexFirstPoint - 1;

				while (prevIndex > 0 && !this.plotPoints[prevIndex].isValid()) {
					prevIndex--;
				}

				if (this.plotPoints[prevIndex].isValid()) {
					if (this.plotPoints[prevIndex].getX() < 0) {
						startPoint.setX(0);
						startPoint.setLabel("extreme");
					} else {
						startPoint.setX(this.dim[0]);
						startPoint.setLabel("extreme");
					}
				}
			}
		}

		// Calculate the end point
		var endPoint = new GPoint(shapePoints[shapePoints.length - 1]);

		if (endPoint.getX() !== 0 && endPoint.getX() !== this.dim[0] && indexLastPoint !== nPoints - 1) {
			nextIndex = indexLastPoint + 1;

			while (nextIndex < nPoints - 1 && !this.plotPoints[nextIndex].isValid()) {
				nextIndex++;
			}

			if (this.plotPoints[nextIndex].isValid()) {
				if (this.plotPoints[nextIndex].getX() < 0) {
					endPoint.setX(0);
					endPoint.setLabel("extreme");
				} else {
					endPoint.setX(this.dim[0]);
					endPoint.setLabel("extreme");
				}
			}
		}

		// Add the end point if it's a new extreme
		if (endPoint.getLabel() === "extreme") {
			shapePoints.push(endPoint);
		}

		// Add the reference connections
		if (this.yLog && referenceValue <= 0) {
			referenceValue = Math.min(this.yLim[0], this.yLim[1]);
		}

		var plotReference = this.valueToPlot(1, referenceValue);

		if (-plotReference[1] < 0) {
			shapePoints.push(new GPoint(endPoint.getX(), 0));
			shapePoints.push(new GPoint(startPoint.getX(), 0));
		} else if (-plotReference[1] > this.dim[1]) {
			shapePoints.push(new GPoint(endPoint.getX(), -this.dim[1]));
			shapePoints.push(new GPoint(startPoint.getX(), -this.dim[1]));
		} else {
			shapePoints.push(new GPoint(endPoint.getX(), plotReference[1]));
			shapePoints.push(new GPoint(startPoint.getX(), plotReference[1]));
		}

		// Add the starting point if it's a new extreme
		if (startPoint.getLabel() === "extreme") {
			shapePoints.push(startPoint);
		}
	}

	return shapePoints;
};

GLayer.prototype.getVerticalShape = function(referenceValue) {
	// Collect the points and cuts inside the box
	var point, addedPoints, nextIndex;
	var nPoints = this.plotPoints.length;
	var shapePoints = [];
	var indexFirstPoint = -1;
	var indexLastPoint = -1;

	for (var i = 0; i < nPoints; i++) {
		point = this.plotPoints[i];

		if (point.isValid()) {
			addedPoints = false;

			// Add the point if it's inside the box
			if (this.inside[i]) {
				shapePoints.push(new GPoint(point.getX(), point.getY(), "normal point"));
				addedPoints = true;
			} else if (-point.getY() >= 0 && -point.getY() <= this.dim[1]) {
				// If it's outside, add the projection of the point on the
				// vertical axes
				if (point.getX() < 0) {
					shapePoints.push(new GPoint(0, point.getY(), "projection"));
					addedPoints = true;
				} else {
					shapePoints.push(new GPoint(this.dim[0], point.getY(), "projection"));
					addedPoints = true;
				}
			}

			// Add the box cuts if there is any
			nextIndex = i + 1;

			while (nextIndex < nPoints - 1 && !this.plotPoints[nextIndex].isValid()) {
				nextIndex++;
			}

			if (nextIndex < nPoints && this.plotPoints[nextIndex].isValid()) {
				var nCuts = this.obtainBoxIntersections(point, this.plotPoints[nextIndex]);

				for (var j = 0; j < nCuts; j++) {
					shapePoints.push(new GPoint(this.cuts[j][0], this.cuts[j][1], "cut"));
					addedPoints = true;
				}
			}

			if (addedPoints) {
				if (indexFirstPoint < 0) {
					indexFirstPoint = i;
				}

				indexLastPoint = i;
			}
		}
	}

	// Continue if there are points in the shape
	if (shapePoints.length > 0) {
		// Calculate the starting point
		var startPoint = new GPoint(shapePoints[0]);

		if (startPoint.getY() !== 0 && startPoint.getY() !== -this.dim[1]) {
			if (startPoint.getLabel() === "cut") {
				if (-this.plotPoints[indexFirstPoint].getY() < 0) {
					startPoint.setY(0);
					startPoint.setLabel("extreme");
				} else {
					startPoint.setY(-this.dim[1]);
					startPoint.setLabel("extreme");
				}
			} else if (indexFirstPoint !== 0) {
				// Get the previous valid point
				var prevIndex = indexFirstPoint - 1;

				while (prevIndex > 0 && !this.plotPoints[prevIndex].isValid()) {
					prevIndex--;
				}

				if (this.plotPoints[prevIndex].isValid()) {
					if (-this.plotPoints[prevIndex].getY() < 0) {
						startPoint.setY(0);
						startPoint.setLabel("extreme");
					} else {
						startPoint.setY(-this.dim[1]);
						startPoint.setLabel("extreme");
					}
				}
			}
		}

		// Calculate the end point
		var endPoint = new GPoint(shapePoints[shapePoints.length - 1]);

		if (endPoint.getY() !== 0 && endPoint.getY() !== -this.dim[1] && indexLastPoint !== nPoints - 1) {
			nextIndex = indexLastPoint + 1;

			while (nextIndex < nPoints - 1 && !this.plotPoints[nextIndex].isValid()) {
				nextIndex++;
			}

			if (this.plotPoints[nextIndex].isValid()) {
				if (-this.plotPoints[nextIndex].getY() < 0) {
					endPoint.setY(0);
					endPoint.setLabel("extreme");
				} else {
					endPoint.setY(-this.dim[1]);
					endPoint.setLabel("extreme");
				}
			}
		}

		// Add the end point if it's a new extreme
		if (endPoint.getLabel() === "extreme") {
			shapePoints.push(endPoint);
		}

		// Add the reference connections
		if (this.xLog && referenceValue <= 0) {
			referenceValue = Math.min(this.xLim[0], this.xLim[1]);
		}

		var plotReference = this.valueToPlot(referenceValue, 1);

		if (plotReference[0] < 0) {
			shapePoints.push(new GPoint(0, endPoint.getY()));
			shapePoints.push(new GPoint(0, startPoint.getY()));
		} else if (plotReference[0] > this.dim[0]) {
			shapePoints.push(new GPoint(this.dim[0], endPoint.getY()));
			shapePoints.push(new GPoint(this.dim[0], startPoint.getY()));
		} else {
			shapePoints.push(new GPoint(plotReference[0], endPoint.getY()));
			shapePoints.push(new GPoint(plotReference[0], startPoint.getY()));
		}

		// Add the starting point if it's a new extreme
		if (startPoint.getLabel() === "extreme") {
			shapePoints.push(startPoint);
		}
	}

	return shapePoints;
};

GLayer.prototype.drawLabel = function(point) {
	var xPlot = this.valueToXPlot(point.getX());
	var yPlot = this.valueToYPlot(point.getY());

	if (this.isValidNumber(xPlot) && this.isValidNumber(yPlot)) {
		var xLabelPos = xPlot + this.labelSeparation[0];
		var yLabelPos = yPlot - this.labelSeparation[1];
		var delta = this.fontSize / 4;

		this.parent.push();
		this.parent.rectMode(this.parent.CORNER);
		this.parent.noStroke();
		this.parent.textFont(this.fontName);
		this.parent.textSize(this.fontSize);
		this.parent.textAlign(this.parent.LEFT, this.parent.BOTTOM);

		// Draw the background
		this.parent.fill(this.labelBgColor);
		this.parent.rect(xLabelPos - delta, yLabelPos - this.fontSize - delta, this.parent.textWidth(point.getLabel()) + 2 * delta, this.fontSize + 2 * delta);

		// Draw the text
		this.parent.fill(this.fontColor);
		this.parent.text(point.getLabel(), xLabelPos, yLabelPos);
		this.parent.pop();
	}
};

GLayer.prototype.drawLabelAtPlotPos = function(xPlot, yPlot) {
	var point = this.getPointAtPlotPos(xPlot, yPlot);

	if ( typeof point !== "undefined") {
		this.drawLabel(point);
	}
};

GLayer.prototype.drawHistogram = function() {
	if ( typeof this.hist !== "undefined") {
		this.hist.draw(this.valueToPlot(this.histBasePoint));
	}
};

GLayer.prototype.drawPolygon = function(polygonPoints, polygonColor) {
	var i;

	if (polygonPoints.length > 2) {
		// Remove the polygon invalid points
		var plotPolygonPoints = this.valueToPlot(polygonPoints);
		var counter = 0;

		for ( i = 0; i < plotPolygonPoints.length; i++) {
			if (plotPolygonPoints[i].isValid()) {
				plotPolygonPoints[counter] = plotPolygonPoints[i];
				counter++;
			}
		}

		plotPolygonPoints.splice(counter, Number.MAX_VALUE);

		// Create a temporal array with the points inside the plotting area
		// and the valid box cuts
		var point;
		var nPoints = plotPolygonPoints.length;
		var tmp = [];

		for ( i = 0; i < nPoints; i++) {
			point = plotPolygonPoints[i];

			if (this.isInside(point)) {
				tmp.push(new GPoint(point.getX(), point.getY(), "normal point"));
			}

			// Obtain the cuts with the next point
			var nextIndex = (i + 1 < nPoints) ? i + 1 : 0;
			var nCuts = this.obtainBoxIntersections(point, plotPolygonPoints[nextIndex]);

			if (nCuts === 1) {
				tmp.push(new GPoint(this.cuts[0][0], this.cuts[0][1], "single cut"));
			} else if (nCuts > 1) {
				tmp.push(new GPoint(this.cuts[0][0], this.cuts[0][1], "double cut"));
				tmp.push(new GPoint(this.cuts[1][0], this.cuts[1][1], "double cut"));
			}
		}

		// Final version of the polygon
		nPoints = tmp.length;
		var croppedPoly = [];

		for ( i = 0; i < nPoints; i++) {
			// Add the point
			croppedPoly.push(tmp[i]);

			// Add new points in case we have two consecutive cuts, one of
			// them is single, and they are in consecutive axes
			var next = (i + 1 < nPoints) ? i + 1 : 0;
			var label = tmp[i].getLabel();
			var nextLabel = tmp[next].getLabel();

			var cond = (label === "single cut" && nextLabel === "single cut") || (label === "single cut" && nextLabel === "double cut") || (label === "double cut" && nextLabel === "single cut");

			if (cond) {
				var x1 = tmp[i].getX();
				var y1 = tmp[i].getY();
				var x2 = tmp[next].getX();
				var y2 = tmp[next].getY();
				var deltaX = Math.abs(x2 - x1);
				var deltaY = Math.abs(y2 - y1);

				// Check that they come from consecutive axes
				if (deltaX > 0 && deltaY > 0 && deltaX !== this.dim[0] && deltaY !== this.dim[1]) {
					var x = (x1 === 0 || x1 === this.dim[0]) ? x1 : x2;
					var y = (y1 === 0 || y1 === -this.dim[1]) ? y1 : y2;
					croppedPoly.push(new GPoint(x, y, "special cut"));
				}
			}
		}

		// Draw the cropped polygon
		if (croppedPoly.length > 2) {
			this.parent.push();
			this.parent.fill(polygonColor);
			this.parent.noStroke();
			this.parent.beginShape();

			for ( i = 0; i < croppedPoly.length; i++) {
				this.parent.vertex(croppedPoly[i].getX(), croppedPoly[i].getY());
			}

			this.parent.endShape(this.parent.CLOSE);
			this.parent.pop();
		}
	}
};

GLayer.prototype.drawAnnotation = function(text, x, y, horAlign, verAlign) {
	var xPlot = this.valueToXPlot(x);
	var yPlot = this.valueToYPlot(y);

	if (this.isValidNumber(xPlot) && this.isValidNumber(yPlot) && this.isInside(xPlot, yPlot)) {
		if (horAlign !== this.parent.CENTER && horAlign !== this.parent.RIGHT && horAlign !== this.parent.LEFT) {
			horAlign = this.parent.LEFT;
		}

		if (verAlign !== this.parent.CENTER && verAlign !== this.parent.TOP && verAlign !== this.parent.BOTTOM) {
			verAlign = this.parent.CENTER;
		}

		// A trick to really center the text vertically
		if (verAlign === this.parent.CENTER) {
			verAlign = this.parent.BOTTOM;
			yPlot += this.fontSize / 2;
		}

		this.parent.push();
		this.parent.textFont(this.fontName);
		this.parent.textSize(this.fontSize);
		this.parent.fill(this.fontColor);
		this.parent.textAlign(horAlign, verAlign);
		this.parent.text(text, xPlot, yPlot);
		this.parent.pop();
	}
};

GLayer.prototype.setDim = function() {
	var xDim, yDim;

	if (arguments.length === 2) {
		xDim = arguments[0];
		yDim = arguments[1];
	} else if (arguments.length === 1) {
		xDim = arguments[0][0];
		yDim = arguments[0][1];
	} else {
		throw new Error("GLayer.setDim(): signature not supported");
	}

	if (xDim > 0 && yDim > 0) {
		this.dim[0] = xDim;
		this.dim[1] = yDim;
		this.updatePlotPoints();

		if ( typeof this.hist !== "undefined") {
			this.hist.setDim(this.dim);
			this.hist.setPlotPoints(this.plotPoints);
		}
	}
};

GLayer.prototype.setXLim = function() {
	var xMin, xMax;

	if (arguments.length === 2) {
		xMin = arguments[0];
		xMax = arguments[1];
	} else if (arguments.length === 1) {
		xMin = arguments[0][0];
		xMax = arguments[0][1];
	} else {
		throw new Error("GLayer.setXLim(): signature not supported");
	}

	if (xMin !== xMax && this.isValidNumber(xMin) && this.isValidNumber(xMax)) {
		// Make sure the new limits makes sense
		if (this.xLog && (xMin <= 0 || xMax <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.xLim[0] = xMin;
			this.xLim[1] = xMax;
			this.updatePlotPoints();
			this.updateInsideList();

			if ( typeof this.hist !== "undefined") {
				this.hist.setPlotPoints(this.plotPoints);
			}
		}
	}
};

GLayer.prototype.setYLim = function() {
	var yMin, yMax;

	if (arguments.length === 2) {
		yMin = arguments[0];
		yMax = arguments[1];
	} else if (arguments.length === 1) {
		yMin = arguments[0][0];
		yMax = arguments[0][1];
	} else {
		throw new Error("GLayer.setYLim(): signature not supported");
	}

	if (yMin !== yMax && this.isValidNumber(yMin) && this.isValidNumber(yMax)) {
		// Make sure the new limits makes sense
		if (this.yLog && (yMin <= 0 || yMax <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.yLim[0] = yMin;
			this.yLim[1] = yMax;
			this.updatePlotPoints();
			this.updateInsideList();

			if ( typeof this.hist !== "undefined") {
				this.hist.setPlotPoints(this.plotPoints);
			}
		}
	}
};

GLayer.prototype.setXYLim = function() {
	var xMin, xMax, yMin, yMax;

	if (arguments.length === 4) {
		xMin = arguments[0];
		xMax = arguments[1];
		yMin = arguments[2];
		yMax = arguments[3];
	} else if (arguments.length === 2) {
		xMin = arguments[0][0];
		xMax = arguments[0][1];
		yMin = arguments[1][0];
		yMax = arguments[1][1];
	} else {
		throw new Error("GLayer.setXYLim(): signature not supported");
	}

	if (xMin !== xMax && yMin !== yMax && this.isValidNumber(xMin) && this.isValidNumber(xMax) && this.isValidNumber(yMin) && this.isValidNumber(yMax)) {
		// Make sure the new limits make sense
		if (this.xLog && (xMin <= 0 || xMax <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.xLim[0] = xMin;
			this.xLim[1] = xMax;
		}

		if (this.yLog && (yMin <= 0 || yMax <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.yLim[0] = yMin;
			this.yLim[1] = yMax;
		}

		this.updatePlotPoints();
		this.updateInsideList();

		if ( typeof this.hist !== "undefined") {
			this.hist.setPlotPoints(this.plotPoints);
		}
	}
};

GLayer.prototype.setLimAndLog = function() {
	var xMin, xMax, yMin, yMax, xLog, yLog;

	if (arguments.length === 6) {
		xMin = arguments[0];
		xMax = arguments[1];
		yMin = arguments[2];
		yMax = arguments[3];
		xLog = arguments[4];
		yLog = arguments[5];
	} else if (arguments.length === 4) {
		xMin = arguments[0][0];
		xMax = arguments[0][1];
		yMin = arguments[1][0];
		yMax = arguments[1][1];
		xLog = arguments[2];
		yLog = arguments[3];
	} else {
		throw new Error("GLayer.setLimAndLog(): signature not supported");
	}

	if (xMin !== xMax && yMin !== yMax && this.isValidNumber(xMin) && this.isValidNumber(xMax) && this.isValidNumber(yMin) && this.isValidNumber(yMax)) {
		// Make sure the new limits make sense
		if (xLog && (xMin <= 0 || xMax <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.xLim[0] = xMin;
			this.yLim[1] = xMax;
			this.xLog = xLog;
		}

		if (yLog && (yMin <= 0 || yMax <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.yLim[0] = yMin;
			this.yLim[1] = yMax;
			this.yLog = yLog;
		}

		this.updatePlotPoints();
		this.updateInsideList();

		if ( typeof this.hist !== "undefined") {
			this.hist.setPlotPoints(this.plotPoints);
		}
	}
};

GLayer.prototype.setXLog = function(xLog) {
	if (xLog !== this.xLog) {
		if (xLog && (this.xLim[0] <= 0 || this.xLim[1] <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
			console.log("Will set horizontal limits to (0.1, 10)");
			this.xLim[0] = 0.1;
			this.xLim[1] = 10;
		}

		this.xLog = xLog;
		this.updatePlotPoints();
		this.updateInsideList();

		if ( typeof this.hist !== "undefined") {
			this.hist.setPlotPoints(this.plotPoints);
		}
	}
};

GLayer.prototype.setYLog = function(yLog) {
	if (yLog !== this.yLog) {
		if (yLog && (this.yLim[0] <= 0 || this.yLim[1] <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
			console.log("Will set horizontal limits to (0.1, 10)");
			this.yLim[0] = 0.1;
			this.yLim[1] = 10;
		}

		this.yLog = yLog;
		this.updatePlotPoints();
		this.updateInsideList();

		if ( typeof this.hist !== "undefined") {
			this.hist.setPlotPoints(this.plotPoints);
		}
	}
};

GLayer.prototype.setPoints = function(points) {
	var i;
	var nPoints = points.length;

	if (this.points.length > nPoints) {
		this.points.splice(nPoints, Number.MAX_VALUE);
	} else {
		for ( i = this.points.length; i < nPoints; i++) {
			this.points[i] = new GPoint();
		}
	}

	for ( i = 0; i < nPoints; i++) {
		this.points[i].set(points[i]);
	}

	this.updatePlotPoints();
	this.updateInsideList();

	if ( typeof this.hist !== "undefined") {
		this.hist.setPlotPoints(this.plotPoints);
	}
};

GLayer.prototype.setPoint = function() {
	var index, x, y, label;
	var nPoints = this.points.length;

	if (arguments.length === 4) {
		index = arguments[0];
		x = arguments[1];
		y = arguments[2];
		label = arguments[3];
	} else if (arguments.length === 3) {
		index = arguments[0];
		x = arguments[1];
		y = arguments[2];
		label = (index < nPoints) ? this.points[index].getLabel() : "";
	} else if (arguments.length === 2) {
		index = arguments[0];
		x = arguments[1].getX();
		y = arguments[1].getY();
		label = arguments[1].getLabel();
	} else {
		throw new Error("GLayer.setPoint(): signature not supported");
	}

	if (index < nPoints) {
		this.points[index].set(x, y, label);
		this.plotPoints[index].set(this.valueToXPlot(x), this.valueToYPlot(y), label);
		this.inside[index] = this.isInside(this.plotPoints[index]);
	} else if (index === nPoints) {
		this.points[index] = new GPoint(x, y, label);
		this.plotPoints[index] = new GPoint(this.valueToXPlot(x), this.valueToYPlot(y), label);
		this.inside[index] = this.isInside(this.plotPoints[index]);
	} else {
		throw new Error("GLayer.setPoint(): the index position is outside the array size");
	}

	if ( typeof this.hist !== "undefined") {
		this.hist.setPlotPoint(index, this.plotPoints[index]);
	}
};

GLayer.prototype.addPoint = function() {
	var x, y, label;

	if (arguments.length === 3) {
		x = arguments[0];
		y = arguments[1];
		label = arguments[2];
	} else if (arguments.length === 2) {
		x = arguments[0];
		y = arguments[1];
		label = "";
	} else if (arguments.length === 1) {
		x = arguments[0].getX();
		y = arguments[0].getY();
		label = arguments[0].getLabel();
	} else {
		throw new Error("GLayer.addPoint(): signature not supported");
	}

	this.points.push(new GPoint(x, y, label));
	this.plotPoints.push(new GPoint(this.valueToXPlot(x), this.valueToYPlot(y), label));
	this.inside.push(this.isInside(this.plotPoints[this.plotPoints.length - 1]));

	if ( typeof this.hist !== "undefined") {
		this.hist.addPlotPoint(this.plotPoints[this.plotPoints.length - 1]);
	}
};

GLayer.prototype.addPoints = function(newPoints) {
	var newPoint;
	var nNewPoints = newPoints.length;

	for (var i = 0; i < nNewPoints; i++) {
		newPoint = newPoints[i];
		this.points.push(new GPoint(newPoint));
		this.plotPoints.push(new GPoint(this.valueToXPlot(newPoint.getX()), this.valueToYPlot(newPoint.getY()), newPoint.getLabel()));
		this.inside.push(this.isInside(this.plotPoints[this.plotPoints.length - 1]));
	}

	if ( typeof this.hist !== "undefined") {
		this.hist.setPlotPoints(this.plotPoints);
	}
};

GLayer.prototype.addPointAtIndexPos = function() {
	var index, x, y, label;

	if (arguments.length === 4) {
		index = arguments[0];
		x = arguments[1];
		y = arguments[2];
		label = arguments[3];
	} else if (arguments.length === 3) {
		index = arguments[0];
		x = arguments[1];
		y = arguments[2];
		label = "";
	} else if (arguments.length === 2) {
		index = arguments[0];
		x = arguments[1].getX();
		y = arguments[1].getY();
		label = arguments[1].getLabel();
	} else {
		throw new Error("GLayer.addPointAtIndexPos(): signature not supported");
	}

	if (index <= this.points.length) {
		this.points.splice(index, 0, new GPoint(x, y, label));
		this.plotPoints.splice(index, 0, new GPoint(this.valueToXPlot(x), this.valueToYPlot(y), label));
		this.inside.splice(index, 0, this.isInside(this.plotPoints[index]));

		if ( typeof this.hist !== "undefined") {
			this.hist.setPlotPoints(this.plotPoints);
		}
	}
};

GLayer.prototype.removePoint = function(index) {
	if (index < this.points.length) {
		this.points.splice(index, 1);
		this.plotPoints.splice(index, 1);
		this.inside.splice(index, 1);

		if ( typeof this.hist !== "undefined") {
			this.hist.removePlotPoint(index);
		}
	}
};

GLayer.prototype.setInside = function(inside) {
	if (inside.length === this.inside.length) {
		this.inside = inside.slice();
	}
};

GLayer.prototype.setPointColors = function(pointColors) {
	if (pointColors.length > 0) {
		this.pointColors = pointColors.slice();
	}
};

GLayer.prototype.setPointColor = function(pointColor) {
	this.pointColors = [pointColor];
};

GLayer.prototype.setPointSizes = function(pointSizes) {
	if (pointSizes.length > 0) {
		this.pointSizes = pointSizes.slice();
	}
};

GLayer.prototype.setPointSize = function(pointSize) {
	this.pointSizes = [pointSize];
};

GLayer.prototype.setLineColor = function(lineColor) {
	this.lineColor = lineColor;
};

GLayer.prototype.setLineWidth = function(lineWidth) {
	if (lineWidth > 0) {
		this.lineWidth = lineWidth;
	}
};

GLayer.prototype.setHistBasePoint = function(histBasePoint) {
	this.histBasePoint.set(histBasePoint);
};

GLayer.prototype.setHistType = function(histType) {
	if ( typeof this.hist !== "undefined") {
		this.hist.setType(histType);
	}
};

GLayer.prototype.setHistVisible = function(visible) {
	if ( typeof this.hist !== "undefined") {
		this.hist.setVisible(visible);
	}
};

GLayer.prototype.setDrawHistLabels = function(drawHistLabels) {
	if ( typeof this.hist !== "undefined") {
		this.hist.setDrawLabels(drawHistLabels);
	}
};

GLayer.prototype.setLabelBgColor = function(labelBgColor) {
	this.labelBgColor = labelBgColor;
};

GLayer.prototype.setLabelSeparation = function(labelSeparation) {
	this.labelSeparation[0] = labelSeparation[0];
	this.labelSeparation[1] = labelSeparation[1];
};

GLayer.prototype.setFontName = function(fontName) {
	this.fontName = fontName;
};

GLayer.prototype.setFontColor = function(fontColor) {
	this.fontColor = fontColor;
};

GLayer.prototype.setFontSize = function(fontSize) {
	if (fontSize > 0) {
		this.fontSize = fontSize;
	}
};

GLayer.prototype.setFontProperties = function(fontName, fontColor, fontSize) {
	if (fontSize > 0) {
		this.fontName = fontName;
		this.fontColor = fontColor;
		this.fontSize = fontSize;
	}
};

GLayer.prototype.setAllFontProperties = function(fontName, fontColor, fontSize) {
	this.setFontProperties(fontName, fontColor, fontSize);

	if ( typeof this.hist !== "undefined") {
		this.hist.setFontProperties(fontName, fontColor, fontSize);
	}
};

GLayer.prototype.getId = function() {
	return this.id;
};

GLayer.prototype.getDim = function() {
	return this.dim.slice();
};

GLayer.prototype.getXLim = function() {
	return this.xLim.slice();
};

GLayer.prototype.getYLim = function() {
	return this.yLim.slice();
};

GLayer.prototype.getXLog = function() {
	return this.xLog;
};

GLayer.prototype.getYLog = function() {
	return this.yLog;
};

GLayer.prototype.getPoints = function() {
	var points = [];

	for (var i = 0; i < this.points.length; i++) {
		points[i] = new GPoint(this.points[i]);
	}

	return points;
};

GLayer.prototype.getPointsRef = function() {
	return this.points;
};

GLayer.prototype.getPointColors = function() {
	return this.pointColors.slice();
};

GLayer.prototype.getPointSizes = function() {
	return this.pointSizes.slice();
};

GLayer.prototype.getLineColor = function() {
	return this.lineColor;
};

GLayer.prototype.getLineWidth = function() {
	return this.lineWidth;
};

GLayer.prototype.getHistogram = function() {
	return this.hist;
};
