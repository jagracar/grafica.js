/*
 * Plot class. It controls the rest of the graphical elements (layers, axes,
 * title, limits).
 */
function GPlot() {
	var parent, xPos, yPos, plotWidth, plotHeight;

	if (arguments.length === 5) {
		parent = arguments[0];
		xPos = arguments[1];
		yPos = arguments[2];
		plotWidth = arguments[3];
		plotHeight = arguments[4];
	} else if (arguments.length === 3) {
		parent = arguments[0];
		xPos = arguments[1];
		yPos = arguments[2];
		plotWidth = 450;
		plotHeight = 300;
	} else if (arguments.length === 1) {
		parent = arguments[0];
		xPos = 0;
		yPos = 0;
		plotWidth = 450;
		plotHeight = 300;
	} else {
		throw new Error("GPlot constructor: signature not supported");
	}

	// The parent processing object
	this.parent = parent;
	this.parentElt = this.parent._renderer.elt;

	// General properties
	this.pos = [ xPos, yPos ];
	this.outerDim = [ plotWidth, plotHeight ];
	this.mar = [ 60, 70, 40, 30 ];
	this.dim = [ this.outerDim[0] - this.mar[1] - this.mar[3], this.outerDim[1] - this.mar[0] - this.mar[2] ];
	this.xLim = [ 0, 1 ];
	this.yLim = [ 0, 1 ];
	this.fixedXLim = false;
	this.fixedYLim = false;
	this.xLog = false;
	this.yLog = false;
	this.invertedXScale = false;
	this.invertedYScale = false;
	this.includeAllLayersInLim = true;
	this.expandLimFactor = 0.1;

	// Format properties
	this.bgColor = this.parent.color(255);
	this.boxBgColor = this.parent.color(245);
	this.boxLineColor = this.parent.color(210);
	this.boxLineWidth = 1;
	this.gridLineColor = this.parent.color(210);
	this.gridLineWidth = 1;

	// Layers
	this.mainLayer = new GLayer(this.parent, GPlot.MAINLAYERID, this.dim, this.xLim, this.yLim, this.xLog, this.yLog);
	this.layerList = [];

	// Axes and title
	this.xAxis = new GAxis(this.parent, this.parent.BOTTOM, this.dim, this.xLim, this.xLog);
	this.topAxis = new GAxis(this.parent, this.parent.TOP, this.dim, this.xLim, this.xLog);
	this.yAxis = new GAxis(this.parent, this.parent.LEFT, this.dim, this.yLim, this.yLog);
	this.rightAxis = new GAxis(this.parent, this.parent.RIGHT, this.dim, this.yLim, this.yLog);
	this.title = new GTitle(this.parent, this.dim);

	// Setup for the mouse events
	this.zoomingIsActive = false;
	this.zoomFactor = 1.3;
	this.increaseZoomButton = this.parent.LEFT;
	this.decreaseZoomButton = this.parent.RIGHT;
	this.increaseZoomKeyModifier = GPlot.NONE;
	this.decreaseZoomKeyModifier = GPlot.NONE;
	this.centeringIsActive = false;
	this.centeringButton = this.parent.LEFT;
	this.centeringKeyModifier = GPlot.NONE;
	this.panningIsActive = false;
	this.panningButton = this.parent.LEFT;
	this.panningKeyModifier = GPlot.NONE;
	this.panningReferencePoint = undefined;
	this.panningIntervalId = undefined;
	this.labelingIsActive = false;
	this.labelingButton = this.parent.LEFT;
	this.labelingKeyModifier = GPlot.NONE;
	this.mousePos = undefined;
	this.resetIsActive = false;
	this.resetButton = this.parent.RIGHT;
	this.resetKeyModifier = this.parent.CONTROL;
	this.xLimReset = undefined;
	this.yLimReset = undefined;

	// Add the event listeners
	this.clickListener = this.clickEvent.bind(this);
	this.wheelListener = this.wheelEvent.bind(this);
	this.mouseDownListener = this.mouseDownEvent.bind(this);
	this.mouseMoveListener = this.mouseMoveEvent.bind(this);
	this.mouseUpListener = this.mouseUpEvent.bind(this);
	this.touchStartListener = this.touchStartEvent.bind(this);
	this.touchMoveListener = this.touchMoveEvent.bind(this);
	this.touchEndListener = this.touchEndEvent.bind(this);
	this.parentElt.addEventListener("click", this.clickListener, false);
	this.parentElt.addEventListener("wheel", this.wheelListener, false);
	this.parentElt.addEventListener("mousedown", this.mouseDownListener, false);
	this.parentElt.addEventListener("touchstart", this.touchStartListener, false);
}

// Constants
GPlot.MAINLAYERID = "main layer";
GPlot.VERTICAL = 0;
GPlot.HORIZONTAL = 1;
GPlot.BOTH = 2;
GPlot.NONE = 0;

GPlot.prototype.addLayer = function() {
	var id, layer;

	if (arguments.length === 2) {
		id = arguments[0];
		layer = new GLayer(this.parent, id, this.dim, this.xLim, this.yLim, this.xLog, this.yLog);
		layer.setPoints(arguments[1]);
	} else if (arguments.length === 1) {
		id = arguments[0].getId();
		layer = arguments[0];
	} else {
		throw new Error("GPlot.addLayer(): signature not supported");
	}

	// Check that it is the only layer with that id
	var sameId = false;

	if (this.mainLayer.isId(id)) {
		sameId = true;
	} else {
		for (var i = 0; i < this.layerList.length; i++) {
			if (this.layerList[i].isId(id)) {
				sameId = true;
				break;
			}
		}
	}

	// Add the layer to the list
	if (!sameId) {
		layer.setDim(this.dim);
		layer.setLimAndLog(this.xLim, this.yLim, this.xLog, this.yLog);
		this.layerList.push(layer);

		// Calculate and update the new plot limits if necessary
		if (this.includeAllLayersInLim) {
			this.updateLimits();
		}
	} else {
		console.log("A layer with the same id exists. Please change the id and try to add it again.");
	}
};

GPlot.prototype.removeLayer = function(id) {
	var index;

	for (var i = 0; i < this.layerList.length; i++) {
		if (this.layerList[i].isId(id)) {
			index = i;
			break;
		}
	}

	if (typeof index !== "undefined") {
		this.layerList.splice(index, 1);

		// Calculate and update the new plot limits if necessary
		if (this.includeAllLayersInLim) {
			this.updateLimits();
		}
	} else {
		console.log("Couldn't find a layer in the plot with id = " + id);
	}
};

GPlot.prototype.getPlotPosAt = function(xScreen, yScreen) {
	var xPlot = xScreen - (this.pos[0] + this.mar[1]);
	var yPlot = yScreen - (this.pos[1] + this.mar[2] + this.dim[1]);

	return [ xPlot, yPlot ];
};

GPlot.prototype.getScreenPosAtValue = function(xValue, yValue) {
	var xScreen = this.mainLayer.valueToXPlot(xValue) + (this.pos[0] + this.mar[1]);
	var yScreen = this.mainLayer.valueToYPlot(yValue) + (this.pos[1] + this.mar[2] + this.dim[1]);

	return [ xScreen, yScreen ];
};

GPlot.prototype.getPointAt = function() {
	var xScreen, yScreen, layer;

	if (arguments.length === 3) {
		xScreen = arguments[0];
		yScreen = arguments[1];
		layer = this.getLayer(arguments[2]);
	} else if (arguments.length === 2) {
		xScreen = arguments[0];
		yScreen = arguments[1];
		layer = this.mainLayer;
	} else {
		throw new Error("GPlot.getPointAt(): signature not supported");
	}

	var plotPos = this.getPlotPosAt(xScreen, yScreen);
	return layer.getPointAtPlotPos(plotPos[0], plotPos[1]);
};

GPlot.prototype.addPointAt = function() {
	var xScreen, yScreen, layerId;

	if (arguments.length === 3) {
		xScreen = arguments[0];
		yScreen = arguments[1];
		layerId = arguments[2];
	} else if (arguments.length === 2) {
		xScreen = arguments[0];
		yScreen = arguments[1];
		layerId = GPlot.MAINLAYERID;
	} else {
		throw new Error("GPlot.addPointAt(): signature not supported");
	}

	var value = this.getValueAt(xScreen, yScreen);
	this.addPoint(value[0], value[1], "", layerId);
};

GPlot.prototype.removePointAt = function() {
	var xScreen, yScreen, layerId;

	if (arguments.length === 3) {
		xScreen = arguments[0];
		yScreen = arguments[1];
		layerId = arguments[2];
	} else if (arguments.length === 2) {
		xScreen = arguments[0];
		yScreen = arguments[1];
		layerId = GPlot.MAINLAYERID;
	} else {
		throw new Error("GPlot.removePointAt(): signature not supported");
	}

	var plotPos = this.getPlotPosAt(xScreen, yScreen);
	var pointIndex = this.getLayer(layerId).getPointIndexAtPlotPos(plotPos[0], plotPos[1]);

	if (typeof pointIndex !== "undefined") {
		this.removePoint(pointIndex, layerId);
	}
};

GPlot.prototype.getValueAt = function(xScreen, yScreen) {
	var plotPos = this.getPlotPosAt(xScreen, yScreen);
	return this.mainLayer.plotToValue(plotPos[0], plotPos[1]);
};

GPlot.prototype.getRelativePlotPosAt = function(xScreen, yScreen) {
	var plotPos = this.getPlotPosAt(xScreen, yScreen);
	return [ plotPos[0] / this.dim[0], -plotPos[1] / this.dim[1] ];
};

GPlot.prototype.isOverPlot = function() {
	var xScreen, yScreen;

	if (arguments.length === 2) {
		xScreen = arguments[0];
		yScreen = arguments[1];
	} else if (arguments.length === 0) {
		xScreen = this.parent.mouseX;
		yScreen = this.parent.mouseY;
	} else {
		throw new Error("GPlot.isOverPlot(): signature not supported");
	}

	return (xScreen >= this.pos[0]) && (xScreen <= this.pos[0] + this.outerDim[0]) && (yScreen >= this.pos[1]) && (yScreen <= this.pos[1] + this.outerDim[1]);
};

GPlot.prototype.isOverBox = function() {
	var xScreen, yScreen;

	if (arguments.length === 2) {
		xScreen = arguments[0];
		yScreen = arguments[1];
	} else if (arguments.length === 0) {
		xScreen = this.parent.mouseX;
		yScreen = this.parent.mouseY;
	} else {
		throw new Error("GPlot.isOverBox(): signature not supported");
	}

	return (xScreen >= this.pos[0] + this.mar[1]) && (xScreen <= this.pos[0] + this.outerDim[0] - this.mar[3]) && (yScreen >= this.pos[1] + this.mar[2]) && (yScreen <= this.pos[1] + this.outerDim[1] - this.mar[0]);
};

GPlot.prototype.updateLimits = function() {
	// Calculate the new limits and update the axes if needed
	if (!this.fixedXLim) {
		this.xLim = this.calculatePlotXLim();
		this.xAxis.setLim(this.xLim);
		this.topAxis.setLim(this.xLim);
	}

	if (!this.fixedYLim) {
		this.yLim = this.calculatePlotYLim();
		this.yAxis.setLim(this.yLim);
		this.rightAxis.setLim(this.yLim);
	}

	// Update the layers
	this.mainLayer.setXYLim(this.xLim, this.yLim);

	for (var i = 0; i < this.layerList.length; i++) {
		this.layerList[i].setXYLim(this.xLim, this.yLim);
	}
};

GPlot.prototype.calculatePlotXLim = function() {
	// Find the limits for the main layer
	var lim = this.calculatePointsXLim(this.mainLayer.getPointsRef());

	// Include the other layers in the limit calculation if necessary
	if (this.includeAllLayersInLim) {
		for (var i = 0; i < this.layerList.length; i++) {
			var newLim = this.calculatePointsXLim(this.layerList[i].getPointsRef());

			if (typeof newLim !== "undefined") {
				if (typeof lim !== "undefined") {
					lim[0] = Math.min(lim[0], newLim[0]);
					lim[1] = Math.max(lim[1], newLim[1]);
				} else {
					lim = newLim;
				}
			}
		}
	}

	if (typeof lim !== "undefined") {
		// Expand the axis limits a bit
		var delta = (lim[0] === 0) ? 0.1 : 0.1 * lim[0];

		if (this.xLog) {
			if (lim[0] !== lim[1]) {
				delta = Math.exp(this.expandLimFactor * Math.log(lim[1] / lim[0]));
			}

			lim[0] = lim[0] / delta;
			lim[1] = lim[1] * delta;
		} else {
			if (lim[0] !== lim[1]) {
				delta = this.expandLimFactor * (lim[1] - lim[0]);
			}

			lim[0] = lim[0] - delta;
			lim[1] = lim[1] + delta;
		}
	} else {
		if (this.xLog && (this.xLim[0] <= 0 || this.xLim[1] <= 0)) {
			lim = [ 0.1, 10 ];
		} else {
			lim = this.xLim.slice();
		}
	}

	// Invert the limits if necessary
	if (this.invertedXScale && lim[0] < lim[1]) {
		lim = [ lim[1], lim[0] ];
	}

	return lim;
};

GPlot.prototype.calculatePlotYLim = function() {
	// Find the limits for the main layer
	var lim = this.calculatePointsYLim(this.mainLayer.getPointsRef());

	// Include the other layers in the limit calculation if necessary
	if (this.includeAllLayersInLim) {
		for (var i = 0; i < this.layerList.length; i++) {
			var newLim = this.calculatePointsYLim(this.layerList[i].getPointsRef());

			if (typeof newLim !== "undefined") {
				if (typeof lim !== "undefined") {
					lim[0] = Math.min(lim[0], newLim[0]);
					lim[1] = Math.max(lim[1], newLim[1]);
				} else {
					lim = newLim;
				}
			}
		}
	}

	if (typeof lim !== "undefined") {
		// Expand the axis limits a bit
		var delta = (lim[0] === 0) ? 0.1 : 0.1 * lim[0];

		if (this.yLog) {
			if (lim[0] !== lim[1]) {
				delta = Math.exp(this.expandLimFactor * Math.log(lim[1] / lim[0]));
			}

			lim[0] = lim[0] / delta;
			lim[1] = lim[1] * delta;
		} else {
			if (lim[0] !== lim[1]) {
				delta = this.expandLimFactor * (lim[1] - lim[0]);
			}

			lim[0] = lim[0] - delta;
			lim[1] = lim[1] + delta;
		}
	} else {
		if (this.yLog && (this.yLim[0] <= 0 || this.yLim[1] <= 0)) {
			lim = [ 0.1, 10 ];
		} else {
			lim = this.yLim.slice();
		}
	}

	// Invert the limits if necessary
	if (this.invertedYScale && lim[0] < lim[1]) {
		lim = [ lim[1], lim[0] ];
	}

	return lim;
};

GPlot.prototype.calculatePointsXLim = function(points) {
	// Find the points limits
	var lim = [ Number.MAX_VALUE, -Number.MAX_VALUE ];

	for (var i = 0; i < points.length; i++) {
		if (points[i].isValid()) {
			// Use the point if it's inside, and it's not negative if
			// the scale is logarithmic
			var x = points[i].getX();
			var y = points[i].getY();
			var isInside = true;

			if (this.fixedYLim) {
				isInside = ((this.yLim[1] >= this.yLim[0]) && (y >= this.yLim[0]) && (y <= this.yLim[1])) || ((this.yLim[1] < this.yLim[0]) && (y <= this.yLim[0]) && (y >= this.yLim[1]));
			}

			if (isInside && !(this.xLog && x <= 0)) {
				if (x < lim[0]) {
					lim[0] = x;
				}

				if (x > lim[1]) {
					lim[1] = x;
				}
			}
		}
	}

	// Check that the new limits make sense
	if (lim[1] < lim[0]) {
		lim = undefined;
	}

	return lim;
};

GPlot.prototype.calculatePointsYLim = function(points) {
	// Find the points limits
	var lim = [ Number.MAX_VALUE, -Number.MAX_VALUE ];

	for (var i = 0; i < points.length; i++) {
		if (points[i].isValid()) {
			// Use the point if it's inside, and it's not negative if
			// the scale is logarithmic
			var x = points[i].getX();
			var y = points[i].getY();
			var isInside = true;

			if (this.fixedXLim) {
				isInside = ((this.xLim[1] >= this.xLim[0]) && (x >= this.xLim[0]) && (x <= this.xLim[1])) || ((this.xLim[1] < this.xLim[0]) && (x <= this.xLim[0]) && (x >= this.xLim[1]));
			}

			if (isInside && !(this.yLog && y <= 0)) {
				if (y < lim[0]) {
					lim[0] = y;
				}
				if (y > lim[1]) {
					lim[1] = y;
				}
			}
		}
	}

	// Check that the new limits make sense
	if (lim[1] < lim[0]) {
		lim = undefined;
	}

	return lim;
};

GPlot.prototype.moveHorizontalAxesLim = function(delta) {
	// Obtain the new x limits
	var deltaLim;

	if (this.xLog) {
		deltaLim = Math.exp(Math.log(this.xLim[1] / this.xLim[0]) * delta / this.dim[0]);
		this.xLim[0] *= deltaLim;
		this.xLim[1] *= deltaLim;
	} else {
		deltaLim = (this.xLim[1] - this.xLim[0]) * delta / this.dim[0];
		this.xLim[0] += deltaLim;
		this.xLim[1] += deltaLim;
	}

	// Fix the limits
	this.fixedXLim = true;
	this.fixedYLim = true;

	// Move the horizontal axes
	this.xAxis.moveLim(this.xLim);
	this.topAxis.moveLim(this.xLim);

	// Update the plot limits
	this.updateLimits();
};

GPlot.prototype.moveVerticalAxesLim = function(delta) {
	// Obtain the new y limits
	var deltaLim;

	if (this.yLog) {
		deltaLim = Math.exp(Math.log(this.yLim[1] / this.yLim[0]) * delta / this.dim[1]);
		this.yLim[0] *= deltaLim;
		this.yLim[1] *= deltaLim;
	} else {
		deltaLim = (this.yLim[1] - this.yLim[0]) * delta / this.dim[1];
		this.yLim[0] += deltaLim;
		this.yLim[1] += deltaLim;
	}

	// Fix the limits
	this.fixedXLim = true;
	this.fixedYLim = true;

	// Move the vertical axes
	this.yAxis.moveLim(this.yLim);
	this.rightAxis.moveLim(this.yLim);

	// Update the plot limits
	this.updateLimits();
};

GPlot.prototype.centerAndZoom = function(factor, xValue, yValue) {
	// Calculate the new limits
	var deltaLim;

	if (this.xLog) {
		deltaLim = Math.exp(Math.log(this.xLim[1] / this.xLim[0]) / (2 * factor));
		this.xLim = [ xValue / deltaLim, xValue * deltaLim ];
	} else {
		deltaLim = (this.xLim[1] - this.xLim[0]) / (2 * factor);
		this.xLim = [ xValue - deltaLim, xValue + deltaLim ];
	}

	if (this.yLog) {
		deltaLim = Math.exp(Math.log(this.yLim[1] / this.yLim[0]) / (2 * factor));
		this.yLim = [ yValue / deltaLim, yValue * deltaLim ];
	} else {
		deltaLim = (this.yLim[1] - this.yLim[0]) / (2 * factor);
		this.yLim = [ yValue - deltaLim, yValue + deltaLim ];
	}

	// Fix the limits
	this.fixedXLim = true;
	this.fixedYLim = true;

	// Update the horizontal and vertical axes
	this.xAxis.setLim(this.xLim);
	this.topAxis.setLim(this.xLim);
	this.yAxis.setLim(this.yLim);
	this.rightAxis.setLim(this.yLim);

	// Update the plot limits (the layers, because the limits are fixed)
	this.updateLimits();
};

GPlot.prototype.zoom = function() {
	var factor, deltaLim, offset;

	if (arguments.length === 3) {
		factor = arguments[0];
		var xScreen = arguments[1];
		var yScreen = arguments[2];

		var plotPos = this.getPlotPosAt(xScreen, yScreen);
		var value = this.mainLayer.plotToValue(plotPos[0], plotPos[1]);

		if (this.xLog) {
			deltaLim = Math.exp(Math.log(this.xLim[1] / this.xLim[0]) / (2 * factor));
			offset = Math.exp((Math.log(this.xLim[1] / this.xLim[0]) / factor) * (0.5 - plotPos[0] / this.dim[0]));
			this.xLim = [ value[0] * offset / deltaLim, value[0] * offset * deltaLim ];
		} else {
			deltaLim = (this.xLim[1] - this.xLim[0]) / (2 * factor);
			offset = 2 * deltaLim * (0.5 - plotPos[0] / this.dim[0]);
			this.xLim = [ value[0] + offset - deltaLim, value[0] + offset + deltaLim ];
		}

		if (this.yLog) {
			deltaLim = Math.exp(Math.log(this.yLim[1] / this.yLim[0]) / (2 * factor));
			offset = Math.exp((Math.log(this.yLim[1] / this.yLim[0]) / factor) * (0.5 + plotPos[1] / this.dim[1]));
			this.yLim = [ value[1] * offset / deltaLim, value[1] * offset * deltaLim ];
		} else {
			deltaLim = (this.yLim[1] - this.yLim[0]) / (2 * factor);
			offset = 2 * deltaLim * (0.5 + plotPos[1] / this.dim[1]);
			this.yLim = [ value[1] + offset - deltaLim, value[1] + offset + deltaLim ];
		}

		// Fix the limits
		this.fixedXLim = true;
		this.fixedYLim = true;

		// Update the horizontal and vertical axes
		this.xAxis.setLim(this.xLim);
		this.topAxis.setLim(this.xLim);
		this.yAxis.setLim(this.yLim);
		this.rightAxis.setLim(this.yLim);

		// Update the plot limits (the layers, because the limits are fixed)
		this.updateLimits();
	} else if (arguments.length === 1) {
		factor = arguments[0];
		var centerValue = this.mainLayer.plotToValue(this.dim[0] / 2, -this.dim[1] / 2);
		this.centerAndZoom(factor, centerValue[0], centerValue[1]);
	} else {
		throw new Error("GPlot.zoom(): signature not supported");
	}
};

GPlot.prototype.shiftPlotPos = function(valuePlotPos, newPlotPos) {
	// Calculate the new limits
	var deltaLim;
	var deltaXPlot = valuePlotPos[0] - newPlotPos[0];
	var deltaYPlot = valuePlotPos[1] - newPlotPos[1];

	if (this.xLog) {
		deltaLim = Math.exp(Math.log(this.xLim[1] / this.xLim[0]) * deltaXPlot / this.dim[0]);
		this.xLim = [ this.xLim[0] * deltaLim, this.xLim[1] * deltaLim ];
	} else {
		deltaLim = (this.xLim[1] - this.xLim[0]) * deltaXPlot / this.dim[0];
		this.xLim = [ this.xLim[0] + deltaLim, this.xLim[1] + deltaLim ];
	}

	if (this.yLog) {
		deltaLim = Math.exp(-Math.log(this.yLim[1] / this.yLim[0]) * deltaYPlot / this.dim[1]);
		this.yLim = [ this.yLim[0] * deltaLim, this.yLim[1] * deltaLim ];
	} else {
		deltaLim = -(this.yLim[1] - this.yLim[0]) * deltaYPlot / this.dim[1];
		this.yLim = [ this.yLim[0] + deltaLim, this.yLim[1] + deltaLim ];
	}

	// Fix the limits
	this.fixedXLim = true;
	this.fixedYLim = true;

	// Move the horizontal and vertical axes
	this.xAxis.moveLim(this.xLim);
	this.topAxis.moveLim(this.xLim);
	this.yAxis.moveLim(this.yLim);
	this.rightAxis.moveLim(this.yLim);

	// Update the plot limits (the layers, because the limits are fixed)
	this.updateLimits();
};

GPlot.prototype.align = function() {
	var xValue, yValue, xScreen, yScreen;

	if (arguments.length === 4) {
		xValue = arguments[0];
		yValue = arguments[1];
		xScreen = arguments[2];
		yScreen = arguments[3];
	} else if (arguments.length === 3) {
		xValue = arguments[0][0];
		yValue = arguments[0][1];
		xScreen = arguments[1];
		yScreen = arguments[2];
	} else {
		throw new Error("GPlot.align(): signature not supported");
	}

	var valuePlotPos = this.mainLayer.valueToPlot(xValue, yValue);
	var newPlotPos = this.getPlotPosAt(xScreen, yScreen);
	this.shiftPlotPos(valuePlotPos, newPlotPos);
};

GPlot.prototype.center = function(xScreen, yScreen) {
	var valuePlotPos = this.getPlotPosAt(xScreen, yScreen);
	var newPlotPos = [ this.dim[0] / 2, -this.dim[1] / 2 ];
	this.shiftPlotPos(valuePlotPos, newPlotPos);
};

GPlot.prototype.startHistograms = function(histType) {
	this.mainLayer.startHistogram(histType);

	for (var i = 0; i < this.layerList.length; i++) {
		this.layerList[i].startHistogram(histType);
	}
};

GPlot.prototype.defaultDraw = function() {
	this.beginDraw();
	this.drawBackground();
	this.drawBox();
	this.drawXAxis();
	this.drawYAxis();
	this.drawTitle();
	this.drawLines();
	this.drawPoints();
	this.endDraw();
};

GPlot.prototype.beginDraw = function() {
	this.parent.push();
	this.parent.translate(this.pos[0] + this.mar[1], this.pos[1] + this.mar[2] + this.dim[1]);
};

GPlot.prototype.endDraw = function() {
	this.parent.pop();
};

GPlot.prototype.drawBackground = function() {
	this.parent.push();
	this.parent.rectMode(this.parent.CORNER);
	this.parent.fill(this.bgColor);
	this.parent.noStroke();
	this.parent.rect(-this.mar[1], -this.mar[2] - this.dim[1], this.outerDim[0], this.outerDim[1]);
	this.parent.pop();
};

GPlot.prototype.drawBox = function() {
	this.parent.push();
	this.parent.rectMode(this.parent.CORNER);
	this.parent.fill(this.boxBgColor);
	this.parent.stroke(this.boxLineColor);
	this.parent.strokeWeight(this.boxLineWidth);
	this.parent.strokeCap(this.parent.SQUARE);
	this.parent.rect(0, -this.dim[1], this.dim[0], this.dim[1]);
	this.parent.pop();
};

GPlot.prototype.drawXAxis = function() {
	this.xAxis.draw();
};

GPlot.prototype.drawYAxis = function() {
	this.yAxis.draw();
};

GPlot.prototype.drawTopAxis = function() {
	this.topAxis.draw();
};

GPlot.prototype.drawRightAxis = function() {
	this.rightAxis.draw();
};

GPlot.prototype.drawTitle = function() {
	this.title.draw();
};

GPlot.prototype.drawPoints = function() {
	var i;

	if (arguments.length === 1) {
		this.mainLayer.drawPoints(arguments[0]);

		for (i = 0; i < this.layerList.length; i++) {
			this.layerList[0].drawPoints(arguments[0]);
		}
	} else if (arguments.length === 0) {
		this.mainLayer.drawPoints();

		for (i = 0; i < this.layerList.length; i++) {
			this.layerList[i].drawPoints();
		}
	} else {
		throw new Error("GPlot.drawPoints(): signature not supported");
	}
};

GPlot.prototype.drawPoint = function() {
	if (arguments.length === 3) {
		this.mainLayer.drawPoint(arguments[0], arguments[1], arguments[2]);
	} else if (arguments.length === 2) {
		this.mainLayer.drawPoint(arguments[0], arguments[1]);
	} else if (arguments.length === 1) {
		this.mainLayer.drawPoint(arguments[0]);
	} else {
		throw new Error("GPlot.drawPoint(): signature not supported");
	}
};

GPlot.prototype.drawLines = function() {
	this.mainLayer.drawLines();

	for (var i = 0; i < this.layerList.length; i++) {
		this.layerList[i].drawLines();
	}
};

GPlot.prototype.drawLine = function() {
	if (arguments.length === 4) {
		this.mainLayer.drawLine(arguments[0], arguments[1], arguments[2], arguments[3]);
	} else if (arguments.length === 2) {
		this.mainLayer.drawLine(arguments[0], arguments[1]);
	} else {
		throw new Error("GPlot.drawLine(): signature not supported");
	}
};

GPlot.prototype.drawHorizontalLine = function() {
	if (arguments.length === 3) {
		this.mainLayer.drawHorizontalLine(arguments[0], arguments[1], arguments[2]);
	} else if (arguments.length === 1) {
		this.mainLayer.drawHorizontalLine(arguments[0]);
	} else {
		throw new Error("GPlot.drawHorizontalLine(): signature not supported");
	}
};

GPlot.prototype.drawVerticalLine = function() {
	if (arguments.length === 3) {
		this.mainLayer.drawVerticalLine(arguments[0], arguments[1], arguments[2]);
	} else if (arguments.length === 1) {
		this.mainLayer.drawVerticalLine(arguments[0]);
	} else {
		throw new Error("GPlot.drawVerticalLine(): signature not supported");
	}
};

GPlot.prototype.drawFilledContours = function(contourType, referenceValue) {
	this.mainLayer.drawFilledContour(contourType, referenceValue);

	for (var i = 0; i < this.layerList.length; i++) {
		this.layerList[i].drawFilledContour(contourType, referenceValue);
	}
};

GPlot.prototype.drawLabel = function(point) {
	this.mainLayer.drawLabel(point);
};

GPlot.prototype.drawLabelsAt = function(xScreen, yScreen) {
	var plotPos = this.getPlotPosAt(xScreen, yScreen);
	this.mainLayer.drawLabelAtPlotPos(plotPos[0], plotPos[1]);

	for (var i = 0; i < this.layerList.length; i++) {
		this.layerList[i].drawLabelAtPlotPos(plotPos[0], plotPos[1]);
	}
};

GPlot.prototype.drawLabels = function() {
	if (this.labelingIsActive && typeof this.mousePos !== "undefined") {
		this.drawLabelsAt(this.mousePos[0], this.mousePos[1]);
	}
};

GPlot.prototype.drawGridLines = function(gridType) {
	var i;

	this.parent.push();
	this.parent.noFill();
	this.parent.stroke(this.gridLineColor);
	this.parent.strokeWeight(this.gridLineWidth);
	this.parent.strokeCap(this.parent.SQUARE);

	if (gridType === GPlot.BOTH || gridType === GPlot.VERTICAL) {
		var xPlotTicks = this.xAxis.getPlotTicksRef();

		for (i = 0; i < xPlotTicks.length; i++) {
			if (xPlotTicks[i] >= 0 && xPlotTicks[i] <= this.dim[0]) {
				this.parent.line(xPlotTicks[i], 0, xPlotTicks[i], -this.dim[1]);
			}
		}
	}

	if (gridType === GPlot.BOTH || gridType === GPlot.HORIZONTAL) {
		var yPlotTicks = this.yAxis.getPlotTicksRef();

		for (i = 0; i < yPlotTicks.length; i++) {
			if (-yPlotTicks[i] >= 0 && -yPlotTicks[i] <= this.dim[1]) {
				this.parent.line(0, yPlotTicks[i], this.dim[0], yPlotTicks[i]);
			}
		}
	}

	this.parent.pop();
};

GPlot.prototype.drawHistograms = function() {
	this.mainLayer.drawHistogram();

	for (var i = 0; i < this.layerList.length; i++) {
		this.layerList[i].drawHistogram();
	}
};

GPlot.prototype.drawPolygon = function(polygonPoints, polygonColor) {
	this.mainLayer.drawPolygon(polygonPoints, polygonColor);
};

GPlot.prototype.drawAnnotation = function(text, x, y, horAlign, verAlign) {
	this.mainLayer.drawAnnotation(text, x, y, horAlign, verAlign);
};

GPlot.prototype.drawLegend = function(text, xRelativePos, yRelativePos) {
	var rectSize = 14;

	this.parent.push();
	this.parent.rectMode(this.parent.CENTER);
	this.parent.noStroke();

	for (var i = 0; i < text.length; i++) {
		var plotPosition = [ xRelativePos[i] * this.dim[0], -yRelativePos[i] * this.dim[1] ];
		var position = this.mainLayer.plotToValue(plotPosition[0] + rectSize, plotPosition[1]);

		if (i === 0) {
			this.parent.fill(this.mainLayer.getLineColor());
			this.parent.rect(plotPosition[0], plotPosition[1], rectSize, rectSize);
			this.mainLayer.drawAnnotation(text[i], position[0], position[1], this.parent.LEFT, this.parent.CENTER);
		} else {
			this.parent.fill(this.layerList[i - 1].getLineColor());
			this.parent.rect(plotPosition[0], plotPosition[1], rectSize, rectSize);
			this.layerList[i - i].drawAnnotation(text[i], position[0], position[1], this.parent.LEFT, this.parent.CENTER);
		}
	}

	this.parent.pop();
};

GPlot.prototype.setPos = function() {
	if (arguments.length === 2) {
		this.pos[0] = arguments[0];
		this.pos[1] = arguments[1];
	} else if (arguments.length === 1) {
		this.pos[0] = arguments[0][0];
		this.pos[1] = arguments[0][1];
	} else {
		throw new Error("GPlot.setPos(): signature not supported");
	}
};

GPlot.prototype.setOuterDim = function() {
	var xOuterDim, yOuterDim;

	if (arguments.length === 2) {
		xOuterDim = arguments[0];
		yOuterDim = arguments[1];
	} else if (arguments.length === 1) {
		xOuterDim = arguments[0][0];
		yOuterDim = arguments[0][1];
	} else {
		throw new Error("GPlot.setOuterDim(): signature not supported");
	}

	if (xOuterDim > 0 && yOuterDim > 0) {
		// Make sure that the new plot dimensions are positive
		var xDim = xOuterDim - this.mar[1] - this.mar[3];
		var yDim = yOuterDim - this.mar[0] - this.mar[2];

		if (xDim > 0 && yDim > 0) {
			this.outerDim[0] = xOuterDim;
			this.outerDim[1] = yOuterDim;
			this.dim[0] = xDim;
			this.dim[1] = yDim;
			this.xAxis.setDim(this.dim);
			this.topAxis.setDim(this.dim);
			this.yAxis.setDim(this.dim);
			this.rightAxis.setDim(this.dim);
			this.title.setDim(this.dim);

			// Update the layers
			this.mainLayer.setDim(this.dim);

			for (var i = 0; i < this.layerList.lenght; i++) {
				this.layerList[i].setDim(this.dim);
			}
		}
	}
};

GPlot.prototype.setMar = function() {
	var bottomMargin, leftMargin, topMargin, rightMargin;

	if (arguments.length === 4) {
		bottomMargin = arguments[0];
		leftMargin = arguments[1];
		topMargin = arguments[2];
		rightMargin = arguments[3];
	} else if (arguments.length === 1) {
		bottomMargin = arguments[0][0];
		leftMargin = arguments[0][1];
		topMargin = arguments[0][2];
		rightMargin = arguments[0][3];
	} else {
		throw new Error("GPlot.setMar(): signature not supported");
	}

	var xOuterDim = this.dim[0] + leftMargin + rightMargin;
	var yOuterDim = this.dim[1] + bottomMargin + topMargin;

	if (xOuterDim > 0 && yOuterDim > 0) {
		this.mar[0] = bottomMargin;
		this.mar[1] = leftMargin;
		this.mar[2] = topMargin;
		this.mar[3] = rightMargin;
		this.outerDim[0] = xOuterDim;
		this.outerDim[1] = yOuterDim;
	}
};

GPlot.prototype.setDim = function() {
	var xDim, yDim;

	if (arguments.length === 2) {
		xDim = arguments[0];
		yDim = arguments[1];
	} else if (arguments.length === 1) {
		xDim = arguments[0][0];
		yDim = arguments[0][1];
	} else {
		throw new Error("GPlot.setDim(): signature not supported");
	}

	if (xDim > 0 && yDim > 0) {
		// Make sure that the new outer dimensions are positive
		var xOuterDim = xDim + this.mar[1] + this.mar[3];
		var yOuterDim = yDim + this.mar[0] + this.mar[2];

		if (xOuterDim > 0 && yOuterDim > 0) {
			this.outerDim[0] = xOuterDim;
			this.outerDim[1] = yOuterDim;
			this.dim[0] = xDim;
			this.dim[1] = yDim;
			this.xAxis.setDim(this.dim);
			this.topAxis.setDim(this.dim);
			this.yAxis.setDim(this.dim);
			this.rightAxis.setDim(this.dim);
			this.title.setDim(this.dim);

			// Update the layers
			this.mainLayer.setDim(this.dim);

			for (var i = 0; i < this.layerList.length; i++) {
				this.layerList[i].setDim(this.dim);
			}
		}
	}
};

GPlot.prototype.setXLim = function() {
	var lowerLim, upperLim;

	if (arguments.length === 2) {
		lowerLim = arguments[0];
		upperLim = arguments[1];
	} else if (arguments.length === 1) {
		lowerLim = arguments[0][0];
		upperLim = arguments[0][1];
	} else {
		throw new Error("GPlot.setXLim(): signature not supported");
	}

	if (lowerLim !== upperLim) {
		// Make sure the new limits makes sense
		if (this.xLog && (lowerLim <= 0 || upperLim <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.xLim[0] = lowerLim;
			this.xLim[1] = upperLim;
			this.invertedXScale = this.xLim[0] > this.xLim[1];

			// Fix the limits
			this.fixedXLim = true;

			// Update the axes
			this.xAxis.setLim(this.xLim);
			this.topAxis.setLim(this.xLim);

			// Update the plot limits
			this.updateLimits();
		}
	}
};

GPlot.prototype.setYLim = function() {
	var lowerLim, upperLim;

	if (arguments.length === 2) {
		lowerLim = arguments[0];
		upperLim = arguments[1];
	} else if (arguments.length === 1) {
		lowerLim = arguments[0][0];
		upperLim = arguments[0][1];
	} else {
		throw new Error("GPlot.setYLim(): signature not supported");
	}

	if (lowerLim !== upperLim) {
		// Make sure the new limits makes sense
		if (this.yLog && (lowerLim <= 0 || upperLim <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.yLim[0] = lowerLim;
			this.yLim[1] = upperLim;
			this.invertedYScale = this.yLim[0] > this.yLim[1];

			// Fix the limits
			this.fixedYLim = true;

			// Update the axes
			this.yAxis.setLim(this.yLim);
			this.rightAxis.setLim(this.yLim);

			// Update the plot limits
			this.updateLimits();
		}
	}
};

GPlot.prototype.setFixedXLim = function(fixedXLim) {
	this.fixedXLim = fixedXLim;

	// Update the plot limits
	this.updateLimits();
};

GPlot.prototype.setFixedYLim = function(fixedYLim) {
	this.fixedYLim = fixedYLim;

	// Update the plot limits
	this.updateLimits();
};

GPlot.prototype.setLogScale = function(logType) {
	var newXLog = this.xLog;
	var newYLog = this.yLog;

	if (logType === "xy" || logType === "yx") {
		newXLog = true;
		newYLog = true;
	} else if (logType === "x") {
		newXLog = true;
		newYLog = false;
	} else if (logType === "y") {
		newXLog = false;
		newYLog = true;
	} else if (logType === "") {
		newXLog = false;
		newYLog = false;
	}

	// Do something only if the scale changed
	if (newXLog !== this.xLog || newYLog !== this.yLog) {
		// Set the new log scales
		this.xLog = newXLog;
		this.yLog = newYLog;

		// Unfix the limits if the old ones don't make sense
		if (this.xLog && this.fixedXLim && (this.xLim[0] <= 0 || this.xLim[1] <= 0)) {
			this.fixedXLim = false;
		}

		if (this.yLog && this.fixedYLim && (this.yLim[0] <= 0 || this.yLim[1] <= 0)) {
			this.fixedYLim = false;
		}

		// Calculate the new limits if needed
		if (!this.fixedXLim) {
			this.xLim = this.calculatePlotXLim();
		}

		if (!this.fixedYLim) {
			this.yLim = this.calculatePlotYLim();
		}

		// Update the axes
		this.xAxis.setLimAndLog(this.xLim, this.xLog);
		this.topAxis.setLimAndLog(this.xLim, this.xLog);
		this.yAxis.setLimAndLog(this.yLim, this.yLog);
		this.rightAxis.setLimAndLog(this.yLim, this.yLog);

		// Update the layers
		this.mainLayer.setLimAndLog(this.xLim, this.yLim, this.xLog, this.yLog);

		for (var i = 0; i < this.layerList.length; i++) {
			this.layerList[i].setLimAndLog(this.xLim, this.yLim, this.xLog, this.yLog);
		}
	}
};

GPlot.prototype.setInvertedXScale = function(invertedXScale) {
	if (invertedXScale !== this.invertedXScale) {
		this.invertedXScale = invertedXScale;
		var temp = this.xLim[0];
		this.xLim[0] = this.xLim[1];
		this.xLim[1] = temp;

		// Update the axes
		this.xAxis.setLim(this.xLim);
		this.topAxis.setLim(this.xLim);

		// Update the layers
		this.mainLayer.setXLim(this.xLim);

		for (var i = 0; i < this.layerList.length; i++) {
			this.layerList[i].setXLim(this.xLim);
		}
	}
};

GPlot.prototype.invertXScale = function() {
	this.setInvertedXScale(!this.invertedXScale);
};

GPlot.prototype.setInvertedYScale = function(invertedYScale) {
	if (invertedYScale !== this.invertedYScale) {
		this.invertedYScale = invertedYScale;
		var temp = this.yLim[0];
		this.yLim[0] = this.yLim[1];
		this.yLim[1] = temp;

		// Update the axes
		this.yAxis.setLim(this.yLim);
		this.rightAxis.setLim(this.yLim);

		// Update the layers
		this.mainLayer.setYLim(this.yLim);

		for (var i = 0; i < this.layerList.length; i++) {
			this.layerList[i].setYLim(this.yLim);
		}
	}
};

GPlot.prototype.invertYScale = function() {
	this.setInvertedYScale(!this.invertedYScale);
};

GPlot.prototype.setIncludeAllLayersInLim = function(includeAllLayers) {
	if (includeAllLayers !== this.includeAllLayersInLim) {
		this.includeAllLayersInLim = includeAllLayers;

		// Update the plot limits
		this.updateLimits();
	}
};

GPlot.prototype.setExpandLimFactor = function(expandFactor) {
	if (expandFactor >= 0 && expandFactor !== this.expandLimFactor) {
		this.expandLimFactor = expandFactor;

		// Update the plot limits
		this.updateLimits();
	}
};

GPlot.prototype.setBgColor = function(bgColor) {
	this.bgColor = bgColor;
};

GPlot.prototype.setBoxBgColor = function(boxBgColor) {
	this.boxBgColor = boxBgColor;
};

GPlot.prototype.setBoxLineColor = function(boxLineColor) {
	this.boxLineColor = boxLineColor;
};

GPlot.prototype.setBoxLineWidth = function(boxLineWidth) {
	if (boxLineWidth > 0) {
		this.boxLineWidth = boxLineWidth;
	}
};

GPlot.prototype.setGridLineColor = function(gridLineColor) {
	this.gridLineColor = gridLineColor;
};

GPlot.prototype.setGridLineWidth = function(gridLineWidth) {
	if (gridLineWidth > 0) {
		this.gridLineWidth = gridLineWidth;
	}
};

GPlot.prototype.setPoints = function() {
	if (arguments.length === 2) {
		this.getLayer(arguments[1]).setPoints(arguments[0]);
	} else if (arguments.length === 1) {
		this.mainLayer.setPoints(arguments[0]);
	} else {
		throw new Error("GPlot.setPoints(): signature not supported");
	}

	this.updateLimits();
};

GPlot.prototype.setPoint = function() {
	if (arguments.length === 5) {
		this.getLayer(arguments[4]).setPoint(arguments[0], arguments[1], arguments[2], arguments[3]);
	} else if (arguments.length === 4) {
		this.mainLayer.setPoint(arguments[0], arguments[1], arguments[2], arguments[3]);
	} else if (arguments.length === 3 && arguments[1] instanceof GPoint) {
		this.getLayer(arguments[2]).setPoint(arguments[0], arguments[1]);
	} else if (arguments.length === 3) {
		this.mainLayer.setPoint(arguments[0], arguments[1], arguments[2]);
	} else if (arguments.length === 2) {
		this.mainLayer.setPoint(arguments[0], arguments[1]);
	} else {
		throw new Error("GPlot.setPoint(): signature not supported");
	}

	this.updateLimits();
};

GPlot.prototype.addPoint = function() {
	if (arguments.length === 4) {
		this.getLayer(arguments[3]).addPoint(arguments[0], arguments[1], arguments[2]);
	} else if (arguments.length === 3) {
		this.mainLayer.addPoint(arguments[0], arguments[1], arguments[2]);
	} else if (arguments.length === 2 && arguments[0] instanceof GPoint) {
		this.getLayer(arguments[1]).addPoint(arguments[0]);
	} else if (arguments.length === 2) {
		this.mainLayer.addPoint(arguments[0], arguments[1]);
	} else if (arguments.length === 1) {
		this.mainLayer.addPoint(arguments[0]);
	} else {
		throw new Error("GPlot.addPoint(): signature not supported");
	}

	this.updateLimits();
};

GPlot.prototype.addPoints = function() {
	if (arguments.length === 2) {
		this.getLayer(arguments[1]).addPoints(arguments[0]);
	} else if (arguments.length === 1) {
		this.mainLayer.addPoints(arguments[0]);
	} else {
		throw new Error("GPlot.addPoints(): signature not supported");
	}

	this.updateLimits();
};

GPlot.prototype.removePoint = function() {
	if (arguments.length === 2) {
		this.getLayer(arguments[1]).removePoint(arguments[0]);
	} else if (arguments.length === 1) {
		this.mainLayer.removePoint(arguments[0]);
	} else {
		throw new Error("GPlot.removePoint(): signature not supported");
	}

	this.updateLimits();
};

GPlot.prototype.addPointAtIndexPos = function() {
	if (arguments.length === 5) {
		this.getLayer(arguments[4]).addPointAtIndexPos(arguments[0], arguments[1], arguments[2], arguments[3]);
	} else if (arguments.length === 4) {
		this.mainLayer.addPointAtIndexPos(arguments[0], arguments[1], arguments[2], arguments[3]);
	} else if (arguments.length === 3 && arguments[1] instanceof GPoint) {
		this.getLayer(arguments[2]).addPointAtIndexPos(arguments[0], arguments[1]);
	} else if (arguments.length === 3) {
		this.mainLayer.addPointAtIndexPos(arguments[0], arguments[1], arguments[2]);
	} else if (arguments.length === 2) {
		this.mainLayer.addPointAtIndexPos(arguments[0], arguments[1]);
	} else {
		throw new Error("GPlot.addPointAtIndexPos(): signature not supported");
	}

	this.updateLimits();
};

GPlot.prototype.setPointColors = function(pointColors) {
	this.mainLayer.setPointColors(pointColors);
};

GPlot.prototype.setPointColor = function(pointColor) {
	this.mainLayer.setPointColor(pointColor);
};

GPlot.prototype.setPointSizes = function(pointSizes) {
	this.mainLayer.setPointSizes(pointSizes);
};

GPlot.prototype.setPointSize = function(pointSize) {
	this.mainLayer.setPointSize(pointSize);
};

GPlot.prototype.setLineColor = function(lineColor) {
	this.mainLayer.setLineColor(lineColor);
};

GPlot.prototype.setLineWidth = function(lineWidth) {
	this.mainLayer.setLineWidth(lineWidth);
};

GPlot.prototype.setHistBasePoint = function(basePoint) {
	this.mainLayer.setHistBasePoint(basePoint);
};

GPlot.prototype.setHistType = function(histType) {
	this.mainLayer.setHistType(histType);
};

GPlot.prototype.setHistVisible = function(histVisible) {
	this.mainLayer.setHistVisible(histVisible);
};

GPlot.prototype.setDrawHistLabels = function(drawHistLabels) {
	this.mainLayer.setDrawHistLabels(drawHistLabels);
};

GPlot.prototype.setLabelBgColor = function(labelBgColor) {
	this.mainLayer.setLabelBgColor(labelBgColor);
};

GPlot.prototype.setLabelSeparation = function(labelSeparation) {
	this.mainLayer.setLabelSeparation(labelSeparation);
};

GPlot.prototype.setTitleText = function(text) {
	this.title.setText(text);
};

GPlot.prototype.setAxesOffset = function(offset) {
	this.xAxis.setOffset(offset);
	this.topAxis.setOffset(offset);
	this.yAxis.setOffset(offset);
	this.rightAxis.setOffset(offset);
};

GPlot.prototype.setTicksLength = function(tickLength) {
	this.xAxis.setTickLength(tickLength);
	this.topAxis.setTickLength(tickLength);
	this.yAxis.setTickLength(tickLength);
	this.rightAxis.setTickLength(tickLength);
};

GPlot.prototype.setHorizontalAxesNTicks = function(nTicks) {
	this.xAxis.setNTicks(nTicks);
	this.topAxis.setNTicks(nTicks);
};

GPlot.prototype.setHorizontalAxesTicksSeparation = function(ticksSeparation) {
	this.xAxis.setTicksSeparation(ticksSeparation);
	this.topAxis.setTicksSeparation(ticksSeparation);
};

GPlot.prototype.setHorizontalAxesTicks = function(ticks) {
	this.xAxis.setTicks(ticks);
	this.topAxis.setTicks(ticks);
};

GPlot.prototype.setVerticalAxesNTicks = function(nTicks) {
	this.yAxis.setNTicks(nTicks);
	this.rightAxis.setNTicks(nTicks);
};

GPlot.prototype.setVerticalAxesTicksSeparation = function(ticksSeparation) {
	this.yAxis.setTicksSeparation(ticksSeparation);
	this.rightAxis.setTicksSeparation(ticksSeparation);
};

GPlot.prototype.setVerticalAxesTicks = function(ticks) {
	this.yAxis.setTicks(ticks);
	this.rightAxis.setTicks(ticks);
};

GPlot.prototype.setFontName = function(fontName) {
	this.mainLayer.setFontName(fontName);
};

GPlot.prototype.setFontColor = function(fontColor) {
	this.mainLayer.setFontColor(fontColor);
};

GPlot.prototype.setFontSize = function(fontSize) {
	this.mainLayer.setFontSize(fontSize);
};

GPlot.prototype.setFontProperties = function(fontName, fontColor, fontSize) {
	this.mainLayer.setFontProperties(fontName, fontColor, fontSize);
};

GPlot.prototype.setAllFontProperties = function(fontName, fontColor, fontSize) {
	this.xAxis.setAllFontProperties(fontName, fontColor, fontSize);
	this.topAxis.setAllFontProperties(fontName, fontColor, fontSize);
	this.yAxis.setAllFontProperties(fontName, fontColor, fontSize);
	this.rightAxis.setAllFontProperties(fontName, fontColor, fontSize);
	this.title.setFontProperties(fontName, fontColor, fontSize);

	this.mainLayer.setAllFontProperties(fontName, fontColor, fontSize);

	for (var i = 0; i < this.layerList.length; i++) {
		this.layerList[i].setAllFontProperties(fontName, fontColor, fontSize);
	}
};

GPlot.prototype.getPos = function() {
	return this.pos.slice();
};

GPlot.prototype.getOuterDim = function() {
	return this.outerDim.slice();
};

GPlot.prototype.getMar = function() {
	return this.mar.slice();
};

GPlot.prototype.getDim = function() {
	return this.dim.slice();
};

GPlot.prototype.getXLim = function() {
	return this.xLim.slice();
};

GPlot.prototype.getYLim = function() {
	return this.yLim.slice();
};

GPlot.prototype.getFixedXLim = function() {
	return this.fixedXLim;
};

GPlot.prototype.getFixedYLim = function() {
	return this.fixedYLim;
};

GPlot.prototype.getXLog = function() {
	return this.xLog;
};

GPlot.prototype.getYLog = function() {
	return this.yLog;
};

GPlot.prototype.getInvertedXScale = function() {
	return this.invertedXScale;
};

GPlot.prototype.getInvertedYScale = function() {
	return this.invertedYScale;
};

GPlot.prototype.getMainLayer = function() {
	return this.mainLayer;
};

GPlot.prototype.getLayer = function(id) {
	var layer;

	if (this.mainLayer.isId(id)) {
		layer = this.mainLayer;
	} else {
		for (var i = 0; i < this.layerList.length; i++) {
			if (this.layerList[i].isId(id)) {
				layer = this.layerList[i];
				break;
			}
		}
	}

	if (typeof layer === "undefined") {
		console.log("Couldn't find a layer in the plot with id = " + id);
	}

	return layer;
};

GPlot.prototype.getXAxis = function() {
	return this.xAxis;
};

GPlot.prototype.getYAxis = function() {
	return this.yAxis;
};

GPlot.prototype.getTopAxis = function() {
	return this.topAxis;
};

GPlot.prototype.getRightAxis = function() {
	return this.rightAxis;
};

GPlot.prototype.getTitle = function() {
	return this.title;
};

GPlot.prototype.getPoints = function() {
	if (arguments.length === 1) {
		return this.getLayer(arguments[0]).getPoints();
	} else if (arguments.length === 0) {
		return this.mainLayer.getPoints();
	} else {
		throw new Error("GPlot.getPoints(): signature not supported");
	}
};

GPlot.prototype.getPointsRef = function() {
	if (arguments.length === 1) {
		return this.getLayer(arguments[0]).getPointsRef();
	} else if (arguments.length === 0) {
		return this.mainLayer.getPointsRef();
	} else {
		throw new Error("GPlot.getPointsRef(): signature not supported");
	}
};

GPlot.prototype.getHistogram = function() {
	if (arguments.length === 1) {
		return this.getLayer(arguments[0]).getHistogram();
	} else if (arguments.length === 0) {
		return this.mainLayer.getHistogram();
	} else {
		throw new Error("GPlot.getHistogram(): signature not supported");
	}
};

GPlot.prototype.activateZooming = function() {
	var zoomFactor, increaseButton, decreaseButton, increaseKeyModifier, decreaseKeyModifier;

	if (arguments.length === 5) {
		zoomFactor = arguments[0];
		increaseButton = arguments[1];
		decreaseButton = arguments[2];
		increaseKeyModifier = arguments[3];
		decreaseKeyModifier = arguments[4];
	} else if (arguments.length === 3) {
		zoomFactor = arguments[0];
		increaseButton = arguments[1];
		decreaseButton = arguments[2];
		increaseKeyModifier = GPlot.NONE;
		decreaseKeyModifier = GPlot.NONE;
	} else if (arguments.length === 1) {
		zoomFactor = arguments[0];
		increaseButton = this.parent.LEFT;
		decreaseButton = this.parent.RIGHT;
		increaseKeyModifier = GPlot.NONE;
		decreaseKeyModifier = GPlot.NONE;
	} else if (arguments.length === 0) {
		zoomFactor = 1.3;
		increaseButton = this.parent.LEFT;
		decreaseButton = this.parent.RIGHT;
		increaseKeyModifier = GPlot.NONE;
		decreaseKeyModifier = GPlot.NONE;
	} else {
		throw new Error("GPlot.activateZooming(): signature not supported");
	}

	this.zoomingIsActive = true;

	if (zoomFactor > 0) {
		this.zoomFactor = zoomFactor;
	}

	if (increaseButton === this.parent.LEFT || increaseButton === this.parent.RIGHT || increaseButton === this.parent.CENTER) {
		this.increaseZoomButton = increaseButton;
	}

	if (decreaseButton === this.parent.LEFT || decreaseButton === this.parent.RIGHT || decreaseButton === this.parent.CENTER) {
		this.decreaseZoomButton = decreaseButton;
	}

	if (increaseKeyModifier === this.parent.SHIFT || increaseKeyModifier === this.parent.CONTROL || increaseKeyModifier === this.parent.ALT || increaseKeyModifier === GPlot.NONE) {
		this.increaseZoomKeyModifier = increaseKeyModifier;
	}

	if (decreaseKeyModifier === this.parent.SHIFT || decreaseKeyModifier === this.parent.CONTROL || decreaseKeyModifier === this.parent.ALT || decreaseKeyModifier === GPlot.NONE) {
		this.decreaseZoomKeyModifier = decreaseKeyModifier;
	}
};

GPlot.prototype.deactivateZooming = function() {
	this.zoomingIsActive = false;
};

GPlot.prototype.activateCentering = function() {
	var button, keyModifier;

	if (arguments.length === 2) {
		button = arguments[0];
		keyModifier = arguments[1];
	} else if (arguments.length === 1) {
		button = arguments[0];
		keyModifier = GPlot.NONE;
	} else if (arguments.length === 0) {
		button = this.parent.LEFT;
		keyModifier = GPlot.NONE;
	} else {
		throw new Error("GPlot.activateCentering(): signature not supported");
	}

	this.centeringIsActive = true;

	if (button === this.parent.LEFT || button === this.parent.RIGHT || button === this.parent.CENTER) {
		this.centeringButton = button;
	}

	if (keyModifier === this.parent.SHIFT || keyModifier === this.parent.CONTROL || keyModifier === this.parent.ALT || keyModifier === GPlot.NONE) {
		this.centeringKeyModifier = keyModifier;
	}
};

GPlot.prototype.deactivateCentering = function() {
	this.centeringIsActive = false;
};

GPlot.prototype.activatePanning = function() {
	var button, keyModifier;

	if (arguments.length === 2) {
		button = arguments[0];
		keyModifier = arguments[1];
	} else if (arguments.length === 1) {
		button = arguments[0];
		keyModifier = GPlot.NONE;
	} else if (arguments.length === 0) {
		button = this.parent.LEFT;
		keyModifier = GPlot.NONE;
	} else {
		throw new Error("GPlot.activatePanning(): signature not supported");
	}

	this.panningIsActive = true;

	if (button === this.parent.LEFT || button === this.parent.RIGHT || button === this.parent.CENTER) {
		this.panningButton = button;
	}

	if (keyModifier === this.parent.SHIFT || keyModifier === this.parent.CONTROL || keyModifier === this.parent.ALT || keyModifier === GPlot.NONE) {
		this.panningKeyModifier = keyModifier;
	}
};

GPlot.prototype.deactivatePanning = function() {
	this.panningIsActive = false;
	this.panningReferencePoint = undefined;
};

GPlot.prototype.activatePointLabels = function() {
	var button, keyModifier;

	if (arguments.length === 2) {
		button = arguments[0];
		keyModifier = arguments[1];
	} else if (arguments.length === 1) {
		button = arguments[0];
		keyModifier = GPlot.NONE;
	} else if (arguments.length === 0) {
		button = this.parent.LEFT;
		keyModifier = GPlot.NONE;
	} else {
		throw new Error("GPlot.activatePointLabels(): signature not supported");
	}

	this.labelingIsActive = true;

	if (button === this.parent.LEFT || button === this.parent.RIGHT || button === this.parent.CENTER) {
		this.labelingButton = button;
	}

	if (keyModifier === this.parent.SHIFT || keyModifier === this.parent.CONTROL || keyModifier === this.parent.ALT || keyModifier === GPlot.NONE) {
		this.labelingKeyModifier = keyModifier;
	}
};

GPlot.prototype.deactivatePointLabels = function() {
	this.labelingIsActive = false;
	this.mousePos = undefined;
};

GPlot.prototype.activateReset = function() {
	var button, keyModifier;

	if (arguments.length === 2) {
		button = arguments[0];
		keyModifier = arguments[1];
	} else if (arguments.length === 1) {
		button = arguments[0];
		keyModifier = GPlot.NONE;
	} else if (arguments.length === 0) {
		button = this.parent.RIGHT;
		keyModifier = GPlot.NONE;
	} else {
		throw new Error("GPlot.activateReset(): signature not supported");
	}

	this.resetIsActive = true;
	this.xLimReset = undefined;
	this.yLimReset = undefined;

	if (button === this.parent.LEFT || button === this.parent.RIGHT || button === this.parent.CENTER) {
		this.resetButton = button;
	}

	if (keyModifier === this.parent.SHIFT || keyModifier === this.parent.CONTROL || keyModifier === this.parent.ALT || keyModifier === GPlot.NONE) {
		this.resetKeyModifier = keyModifier;
	}
};

GPlot.prototype.deactivateReset = function() {
	this.resetIsActive = false;
	this.xLimReset = undefined;
	this.yLimReset = undefined;
};

GPlot.prototype.getButton = function(event) {
	var button;

	if (event.button === 0) {
		button = this.parent.LEFT;
	} else if (event.button === 1) {
		button = this.parent.CENTER;
	} else if (event.button === 2) {
		button = this.parent.RIGHT;
	} else if (typeof event.button === "undefined") {
		button = this.parent.LEFT;
	}

	return button;
};

GPlot.prototype.getModifier = function(event) {
	var modifier;

	if (event.altKey) {
		modifier = this.parent.ALT;
	} else if (event.ctrlKey) {
		modifier = this.parent.CONTROL;
	} else if (event.shiftKey) {
		modifier = this.parent.SHIFT;
	} else {
		modifier = GPlot.NONE;
	}

	return modifier;
};

GPlot.prototype.saveResetLimits = function() {
	if (typeof this.xLimReset === "undefined" || typeof this.yLimReset === "undefined") {
		this.xLimReset = this.xLim.slice();
		this.yLimReset = this.yLim.slice();
	}
};

GPlot.prototype.clickEvent = function(event) {
	var e = event || window.event;

	if (this.isOverBox()) {
		var button = this.getButton(e);
		var modifier = this.getModifier(e);

		if (this.zoomingIsActive) {
			if (button === this.increaseZoomButton && modifier === this.increaseZoomKeyModifier) {
				// Save the axes limits
				if (this.resetIsActive) {
					this.saveResetLimits();
				}

				this.zoom(this.zoomFactor, this.parent.mouseX, this.parent.mouseY);
			} else if (button === this.decreaseZoomButton && modifier === this.decreaseZoomKeyModifier) {
				// Save the axes limits
				if (this.resetIsActive) {
					this.saveResetLimits();
				}

				this.zoom(1 / this.zoomFactor, this.parent.mouseX, this.parent.mouseY);
			}
		}

		if (this.centeringIsActive && button === this.centeringButton && modifier === this.centeringKeyModifier) {
			// Save the axes limits
			if (this.resetIsActive) {
				this.saveResetLimits();
			}

			this.center(this.parent.mouseX, this.parent.mouseY);
		}

		if (this.resetIsActive && button === this.resetButton && modifier === this.resetKeyModifier) {
			if (typeof this.xLimReset !== "undefined" && typeof this.yLimReset !== "undefined") {
				this.setXLim(this.xLimReset);
				this.setYLim(this.yLimReset);
				this.xLimReset = undefined;
				this.yLimReset = undefined;
			}
		}
	}
};

GPlot.prototype.wheelEvent = function(event) {
	var e = event || window.event;

	if (this.isOverBox()) {
		var deltaY = e.deltaY;
		var button = this.parent.CENTER;
		var modifier = this.getModifier(e);

		if (this.zoomingIsActive) {
			if (button === this.increaseZoomButton && modifier === this.increaseZoomKeyModifier && deltaY > 0) {
				e.preventDefault();

				// Save the axes limits
				if (this.resetIsActive) {
					this.saveResetLimits();
				}

				this.zoom(this.zoomFactor, this.parent.mouseX, this.parent.mouseY);
			} else if (button === this.decreaseZoomButton && modifier === this.decreaseZoomKeyModifier && deltaY < 0) {
				e.preventDefault();

				// Save the axes limits
				if (this.resetIsActive) {
					this.saveResetLimits();
				}

				this.zoom(1 / this.zoomFactor, this.parent.mouseX, this.parent.mouseY);
			}
		}
	}
};

GPlot.prototype.mouseDownEvent = function(event) {
	var e = event || window.event;

	if (this.isOverBox()) {
		var addListeners = false;
		var button = this.getButton(e);
		var modifier = this.getModifier(e);

		if (this.panningIsActive && button === this.panningButton && modifier === this.panningKeyModifier) {
			addListeners = true;

			// Save the axes limits
			if (this.resetIsActive) {
				this.saveResetLimits();
			}

			// Calculate the panning reference point
			this.panningReferencePoint = this.getValueAt(this.parent.mouseX, this.parent.mouseY);
		}

		if (this.labelingIsActive && button === this.labelingButton && modifier === this.labelingKeyModifier) {
			addListeners = true;
			this.mousePos = [ this.parent.mouseX, this.parent.mouseY ];
		}

		if (addListeners) {
			// Add the mousemove and mouseup event listeners
			document.addEventListener('mousemove', this.mouseMoveListener, false);
			document.addEventListener('mouseup', this.mouseUpListener, false);
		}
	}
};

GPlot.prototype.mouseMoveEvent = function(event) {
	var e = event || window.event;
	var button = this.getButton(e);
	var modifier = this.getModifier(e);
	event.preventDefault();

	if (this.panningIsActive && button === this.panningButton && modifier === this.panningKeyModifier) {
		this.align(this.panningReferencePoint, this.parent.mouseX, this.parent.mouseY);
	}

	if (this.labelingIsActive && button === this.labelingButton && modifier === this.labelingKeyModifier) {
		this.mousePos = [ this.parent.mouseX, this.parent.mouseY ];
	}
};

GPlot.prototype.mouseUpEvent = function(event) {
	var e = event || window.event;
	var button = this.getButton(e);

	// Remove the mousemove and mouseup event listeners
	document.removeEventListener('mousemove', this.mouseMoveListener, false);
	document.removeEventListener('mouseup', this.mouseUpListener, false);

	if (this.panningIsActive && button === this.panningButton) {
		// Reset the panning variables
		this.panningReferencePoint = undefined;
	}

	if (this.labelingIsActive && button === this.labelingButton) {
		this.mousePos = undefined;
	}
};

GPlot.prototype.touchStartEvent = function(event) {
	var e = event || window.event;
	this.parent._ontouchstart(e);

	if (this.isOverBox()) {
		var addListeners = false;

		if (this.panningIsActive) {
			addListeners = true;
			this.panningReferencePoint = this.getValueAt(this.parent.mouseX, this.parent.mouseY);
		}

		if (this.labelingIsActive) {
			addListeners = true;
			this.mousePos = [ this.parent.mouseX, this.parent.mouseY ];
		}

		if(this.zoomingIsActive && typeof e.touches !== "undefined" && e.touches.length === 2){
			addListeners = true;
			var dx = e.touches[ 0 ].pageX - e.touches[ 1 ].pageX;
			var dy = e.touches[ 0 ].pageY - e.touches[ 1 ].pageY;
			this.zoomStartDistance = Math.sqrt( dx * dx + dy * dy );
			this.zoomStartPosition = [this.parent.mouseX, this.parent.mouseY];
		}

		if (addListeners) {
			// Add the touchmove, touchend and touchcancel event listeners
			document.addEventListener('touchmove', this.touchMoveListener, {passive: false});
			document.addEventListener('touchend', this.touchEndListener, false);
			document.addEventListener('touchcancel', this.touchEndListener, false);
		}
	}
};

GPlot.prototype.touchMoveEvent = function(event) {
	var e = event || window.event;
	e.preventDefault();

	if (this.panningIsActive) {
		this.align(this.panningReferencePoint, this.parent.mouseX, this.parent.mouseY);
	}

	if (this.labelingIsActive) {
		this.mousePos = [ this.parent.mouseX, this.parent.mouseY ];
	}

	if(this.zoomingIsActive && typeof e.touches !== "undefined" && e.touches.length === 2){
		var dx = e.touches[ 0 ].pageX - e.touches[ 1 ].pageX;
		var dy = e.touches[ 0 ].pageY - e.touches[ 1 ].pageY;
		var distance = Math.sqrt( dx * dx + dy * dy );
		this.zoom(distance/this.zoomStartDistance, this.zoomStartPosition[0], this.zoomStartPosition[1]);
		this.zoomStartDistance = distance;
	}
};

GPlot.prototype.touchEndEvent = function(event) {
	// Remove the touchmove, touchend and touch cancel event listeners
	document.removeEventListener('touchmove', this.touchMoveListener, false);
	document.removeEventListener('touchend', this.touchEndListener, false);
	document.removeEventListener('touchcancel', this.touchEndListener, false);

	if (this.panningIsActive) {
		this.panningReferencePoint = undefined;
	}

	if (this.labelingIsActive) {
		this.mousePos = undefined;
	}

	if(this.zoomingIsActive){
		this.zoomStartDistance = undefined;
		this.zoomStartPosition = undefined;		
	}
};

GPlot.prototype.preventDefaultEvent = function(event) {
	var e = event || window.event;

	if (this.isOverBox()) {
		e.preventDefault();
	}
};

GPlot.prototype.contextMenuEvent = function(event) {
	var e = event || window.event;

	if (this.isOverBox()) {
		e.preventDefault();
		this.clickEvent(e);
	}
};

GPlot.prototype.preventWheelDefault = function() {
	this.parentElt.addEventListener("wheel", this.preventDefaultEvent.bind(this), false);
};

GPlot.prototype.preventRightClickDefault = function() {
	this.parentElt.addEventListener("contextmenu", this.contextMenuEvent.bind(this), false);
};
