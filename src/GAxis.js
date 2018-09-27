/*
 * Axis class. 
 */
function GAxis(parent, type, dim, lim, log) {
	// The parent processing object
	this.parent = parent;

	// General properties
	this.type = (type === this.parent.BOTTOM || type === this.parent.TOP || type === this.parent.LEFT || type === this.parent.RIGHT) ? type : this.parent.BOTTOM;
	this.dim = dim.slice();
	this.lim = lim.slice();
	this.log = log;

	// Do some sanity checks
	if (this.log && (this.lim[0] <= 0 || this.lim[1] <= 0)) {
		console.log("The limits are negative. This is not allowed in logarithmic scale.");
		console.log("Will set them to (0.1, 10)");

		if (this.lim[1] > this.lim[0]) {
			this.lim[0] = 0.1;
			this.lim[1] = 10;
		} else {
			this.lim[0] = 10;
			this.lim[1] = 0.1;
		}
	}

	// Format properties
	this.offset = 5;
	this.lineColor = this.parent.color(0);
	this.lineWidth = 1;

	// Ticks properties
	this.nTicks = 5;
	this.ticksSeparation = -1;
	this.ticks = [];
	this.plotTicks = [];
	this.ticksInside = [];
	this.tickLabels = [];
	this.fixedTicks = false;
	this.tickLength = 3;
	this.smallTickLength = 2;
	this.expTickLabels = false;
	this.rotateTickLabels = (this.type === this.parent.BOTTOM || this.type === this.parent.TOP) ? false : true;
	this.drawTickLabels = (this.type === this.parent.BOTTOM || this.type === this.parent.LEFT) ? true : false;
	this.tickLabelOffset = 7;
	this.ticksPrecision = undefined;

	// Label properties
	this.lab = new GAxisLabel(this.parent, this.type, this.dim);
	this.drawAxisLabel = true;

	// Text properties
	this.fontName = "Helvetica";
	this.fontColor = this.parent.color(0);
	this.fontSize = 11;

	// Update the arrays
	this.updateTicks();
	this.updatePlotTicks();
	this.updateTicksInside();
	this.updateTickLabels();
}

GAxis.prototype.obtainSigDigits = function(number) {
	return Math.round(-Math.log(0.5 * Math.abs(number)) / Math.LN10);
};

GAxis.prototype.roundPlus = function(number, sigDigits) {
	// Old way of doing it
	// var bd = new BigDecimal(number);
	// roundedNumber = parseFloat(bd.setScale(sigDigits, RoundingMode.HALF_UP()).longValue().toFixed(sigDigits));

	number = Math.round(number * Math.pow(10, sigDigits)) / Math.pow(10, sigDigits);

	if (sigDigits <= 0) {
		number = Math.round(number);
	}

	return number;
};

GAxis.prototype.adaptSize = function(a, n) {
	if (n < a.length) {
		a.splice(n, Number.MAX_VALUE);
	}
};

GAxis.prototype.updateTicks = function() {
	if (this.log) {
		this.obtainLogarithmicTicks();
	} else {
		this.obtainLinearTicks();
	}
};

GAxis.prototype.obtainLogarithmicTicks = function() {
	// Get the exponents of the first and last ticks in increasing order
	var firstExp, lastExp;

	if (this.lim[1] > this.lim[0]) {
		firstExp = Math.floor(Math.log(this.lim[0]) / Math.LN10);
		lastExp = Math.ceil(Math.log(this.lim[1]) / Math.LN10);
	} else {
		firstExp = Math.floor(Math.log(this.lim[1]) / Math.LN10);
		lastExp = Math.ceil(Math.log(this.lim[0]) / Math.LN10);
	}

	// Calculate the ticks
	var n = (lastExp - firstExp) * 9 + 1;
	this.adaptSize(this.ticks, n);

	for (var exp = firstExp; exp < lastExp; exp++) {
		var base = this.roundPlus(Math.exp(exp * Math.LN10), -exp);

		for (var i = 0; i < 9; i++) {
			this.ticks[(exp - firstExp) * 9 + i] = (i + 1) * base;
		}

	}

	this.ticks[this.ticks.length - 1] = this.roundPlus(Math.exp(lastExp * Math.LN10), -exp);

	// Change the ticks order if necessary
	if (this.lim[1] < this.lim[0]) {
		this.ticks.reverse();
	}
};

GAxis.prototype.obtainLinearTicks = function() {
	// Obtain the required precision for the ticks
	var step = 0;
	var nSteps = 0;
	var sigDigits = 0;

	if (this.ticksSeparation > 0) {
		step = (this.lim[1] > this.lim[0]) ? this.ticksSeparation : -this.ticksSeparation;
		sigDigits = this.obtainSigDigits(step);

		while (this.roundPlus(step, sigDigits) - step !== 0) {
			sigDigits++;
		}

		nSteps = Math.floor((this.lim[1] - this.lim[0]) / step);
	} else if (this.nTicks > 0) {
		step = (this.lim[1] - this.lim[0]) / this.nTicks;
		sigDigits = this.obtainSigDigits(step);
		step = this.roundPlus(step, sigDigits);

		if (step === 0 || Math.abs(step) > Math.abs(this.lim[1] - this.lim[0])) {
			sigDigits++;
			step = this.roundPlus((this.lim[1] - this.lim[0]) / this.nTicks, sigDigits);
		}

		nSteps = Math.floor((this.lim[1] - this.lim[0]) / step);
	}

	// Calculate the linear ticks
	if (nSteps > 0) {
		// Obtain the first tick
		var firstTick = this.lim[0] + ((this.lim[1] - this.lim[0]) - nSteps * step) / 2;

		// Subtract some steps to be sure we have all
		firstTick = this.roundPlus(firstTick - 2 * step, sigDigits);

		while ((this.lim[1] - firstTick) * (this.lim[0] - firstTick) > 0) {
			firstTick = this.roundPlus(firstTick + step, sigDigits);
		}

		// Calculate the rest of the ticks
		var n = Math.floor(Math.abs((this.lim[1] - firstTick) / step)) + 1;
		this.adaptSize(this.ticks, n);
		this.ticks[0] = firstTick;

		for (var i = 1; i < n; i++) {
			this.ticks[i] = this.roundPlus(this.ticks[i - 1] + step, sigDigits);
		}

		// Save the ticks precision
		this.ticksPrecision = sigDigits;
	} else {
		this.ticks = [];
	}
};

GAxis.prototype.updatePlotTicks = function() {
	var scaleFactor, i;
	var n = this.ticks.length;
	this.adaptSize(this.plotTicks, n);

	if (this.log) {
		if (this.type === this.parent.BOTTOM || this.type === this.parent.TOP) {
			scaleFactor = this.dim[0] / Math.log(this.lim[1] / this.lim[0]);
		} else {
			scaleFactor = -this.dim[1] / Math.log(this.lim[1] / this.lim[0]);
		}

		for ( i = 0; i < n; i++) {
			this.plotTicks[i] = Math.log(this.ticks[i] / this.lim[0]) * scaleFactor;
		}
	} else {
		if (this.type === this.parent.BOTTOM || this.type === this.parent.TOP) {
			scaleFactor = this.dim[0] / (this.lim[1] - this.lim[0]);
		} else {
			scaleFactor = -this.dim[1] / (this.lim[1] - this.lim[0]);
		}

		for ( i = 0; i < n; i++) {
			this.plotTicks[i] = (this.ticks[i] - this.lim[0]) * scaleFactor;
		}
	}
};

GAxis.prototype.updateTicksInside = function() {
	var i;
	var n = this.ticks.length;
	this.adaptSize(this.ticksInside, n);

	if (this.type === this.parent.BOTTOM || this.type === this.parent.TOP) {
		for ( i = 0; i < n; i++) {
			this.ticksInside[i] = (this.plotTicks[i] >= 0) && (this.plotTicks[i] <= this.dim[0]);
		}
	} else {
		for ( i = 0; i < n; i++) {
			this.ticksInside[i] = (-this.plotTicks[i] >= 0) && (-this.plotTicks[i] <= this.dim[1]);
		}
	}
};

GAxis.prototype.updateTickLabels = function() {
	var tick, logValue, isExactLogValue, i;
	var n = this.ticks.length;
	this.adaptSize(this.tickLabels, n);

	if (this.log) {
		for ( i = 0; i < n; i++) {
			tick = this.ticks[i];

			if (tick > 0) {
				logValue = Math.log(tick) / Math.LN10;
				isExactLogValue = Math.abs(logValue - Math.round(logValue)) < 0.0001;

				if (isExactLogValue) {
					logValue = Math.round(logValue);

					if (this.expTickLabels) {
						this.tickLabels[i] = "1e" + logValue;
					} else {
						if (logValue > -3.1 && logValue < 3.1) {
							this.tickLabels[i] = (logValue >= 0) ? "" + Math.round(tick) : "" + tick;
						} else {
							this.tickLabels[i] = "1e" + logValue;
						}
					}
				} else {
					this.tickLabels[i] = "";
				}
			} else {
				this.tickLabels[i] = "";
			}
		}
	} else {
		for ( i = 0; i < n; i++) {
			tick = this.ticks[i];

			if (tick % 1 === 0) {
				this.tickLabels[i] = "" + Math.round(tick);
			} else if ( typeof this.ticksPrecision !== "undefined" && this.ticksPrecision >= 0) {
				this.tickLabels[i] = "" + parseFloat(tick).toFixed(this.ticksPrecision);
			} else {
				this.tickLabels[i] = "" + tick;
			}
		}
	}
};

GAxis.prototype.moveLim = function(newLim) {
	if (newLim[1] !== newLim[0]) {
		// Check that the new limit makes sense
		if (this.log && (newLim[0] <= 0 || newLim[1] <= 0)) {
			console.log("The limits are negative. This is not allowed in logarithmic scale.");
		} else {
			this.lim[0] = newLim[0];
			this.lim[1] = newLim[1];

			// Calculate the new ticks if they are not fixed
			if (!this.fixedTicks) {
				var n = this.ticks.length;

				if (this.log) {
					this.obtainLogarithmicTicks();
				} else if (n > 0) {
					// Obtain the ticks precision and the tick separation
					var step = 0;
					var sigDigits = 0;

					if (this.ticksSeparation > 0) {
						step = (this.lim[1] > this.lim[0]) ? this.ticksSeparation : -this.ticksSeparation;
						sigDigits = this.obtainSigDigits(step);

						while (this.roundPlus(step, sigDigits) - step !== 0) {
							sigDigits++;
						}
					} else {
						step = (n === 1) ? this.lim[1] - this.lim[0] : this.ticks[1] - this.ticks[0];
						sigDigits = this.obtainSigDigits(step);
						step = this.roundPlus(step, sigDigits);

						if (step === 0 || Math.abs(step) > Math.abs(this.lim[1] - this.lim[0])) {
							sigDigits++;
							step = (n === 1) ? this.lim[1] - this.lim[0] : this.ticks[1] - this.ticks[0];
							step = this.roundPlus(step, sigDigits);
						}

						step = (this.lim[1] > this.lim[0]) ? Math.abs(step) : -Math.abs(step);
					}

					// Obtain the first tick
					var firstTick = this.ticks[0] + step * Math.ceil((this.lim[0] - this.ticks[0]) / step);
					firstTick = this.roundPlus(firstTick, sigDigits);

					if ((this.lim[1] - firstTick) * (this.lim[0] - firstTick) > 0) {
						firstTick = this.ticks[0] + step * Math.floor((this.lim[0] - this.ticks[0]) / step);
						firstTick = this.roundPlus(firstTick, sigDigits);
					}

					// Calculate the rest of the ticks
					n = Math.floor(Math.abs((this.lim[1] - firstTick) / step)) + 1;
					this.adaptSize(this.ticks, n);
					this.ticks[0] = firstTick;

					for (var i = 1; i < n; i++) {
						this.ticks[i] = this.roundPlus(this.ticks[i - 1] + step, sigDigits);
					}

					// A sanity check
					if (this.ticksPrecision !== sigDigits) {
						console.log("There is a problem in the axis ticks precision calculation");
					}
				}

				// Obtain the new tick labels
				this.updateTickLabels();
			}

			// Update the rest of the arrays
			this.updatePlotTicks();
			this.updateTicksInside();
		}
	}
};

GAxis.prototype.draw = function() {
	switch (this.type) {
	case this.parent.BOTTOM:
		this.drawAsXAxis();
		break;
	case this.parent.LEFT:
		this.drawAsYAxis();
		break;
	case this.parent.TOP:
		this.drawAsTopAxis();
		break;
	case this.parent.RIGHT:
		this.drawAsRightAxis();
		break;
	}

	if (this.drawAxisLabel) {
		this.lab.draw();
	}
};

GAxis.prototype.drawAsXAxis = function() {
	var i;

	// Draw the ticks
	this.parent.push();
	this.parent.stroke(this.lineColor);
	this.parent.strokeWeight(this.lineWidth);
	this.parent.strokeCap(this.parent.SQUARE);

	this.parent.line(0, this.offset, this.dim[0], this.offset);

	for ( i = 0; i < this.plotTicks.length; i++) {
		if (this.ticksInside[i]) {
			if (this.log && this.tickLabels[i] === "") {
				this.parent.line(this.plotTicks[i], this.offset, this.plotTicks[i], this.offset + this.smallTickLength);
			} else {
				this.parent.line(this.plotTicks[i], this.offset, this.plotTicks[i], this.offset + this.tickLength);
			}
		}
	}

	this.parent.pop();

	// Draw the tick labels
	if (this.drawTickLabels) {
		this.parent.push();
		this.parent.textFont(this.fontName);
		this.parent.textSize(this.fontSize);
		this.parent.fill(this.fontColor);
		this.parent.noStroke();

		if (this.rotateTickLabels) {
			var halfPI = 0.5 * Math.PI;
			this.parent.textAlign(this.parent.RIGHT, this.parent.CENTER);

			for ( i = 0; i < this.plotTicks.length; i++) {
				if (this.ticksInside[i] && this.tickLabels[i] !== "") {
					this.parent.push();
					this.parent.translate(this.plotTicks[i], this.offset + this.tickLabelOffset);
					this.parent.rotate(-halfPI);
					this.parent.text(this.tickLabels[i], 0, 0);
					this.parent.pop();
				}
			}
		} else {
			this.parent.textAlign(this.parent.CENTER, this.parent.TOP);

			for ( i = 0; i < this.plotTicks.length; i++) {
				if (this.ticksInside[i] && this.tickLabels[i] !== "") {
					this.parent.text(this.tickLabels[i], this.plotTicks[i], this.offset + this.tickLabelOffset);
				}
			}
		}

		this.parent.pop();
	}
};

GAxis.prototype.drawAsYAxis = function() {
	var i;

	// Draw the ticks
	this.parent.push();
	this.parent.stroke(this.lineColor);
	this.parent.strokeWeight(this.lineWidth);
	this.parent.strokeCap(this.parent.SQUARE);

	this.parent.line(-this.offset, 0, -this.offset, -this.dim[1]);

	for ( i = 0; i < this.plotTicks.length; i++) {
		if (this.ticksInside[i]) {
			if (this.log && this.tickLabels[i] === "") {
				this.parent.line(-this.offset, this.plotTicks[i], -this.offset - this.smallTickLength, this.plotTicks[i]);
			} else {
				this.parent.line(-this.offset, this.plotTicks[i], -this.offset - this.tickLength, this.plotTicks[i]);
			}
		}
	}

	this.parent.pop();

	// Draw the tick labels
	if (this.drawTickLabels) {
		this.parent.push();
		this.parent.textFont(this.fontName);
		this.parent.textSize(this.fontSize);
		this.parent.fill(this.fontColor);
		this.parent.noStroke();

		if (this.rotateTickLabels) {
			var halfPI = 0.5 * Math.PI;
			this.parent.textAlign(this.parent.CENTER, this.parent.BOTTOM);

			for ( i = 0; i < this.plotTicks.length; i++) {
				if (this.ticksInside[i] && this.tickLabels[i] !== "") {
					this.parent.push();
					this.parent.translate(-this.offset - this.tickLabelOffset, this.plotTicks[i]);
					this.parent.rotate(-halfPI);
					this.parent.text(this.tickLabels[i], 0, 0);
					this.parent.pop();
				}
			}
		} else {
			this.parent.textAlign(this.parent.RIGHT, this.parent.CENTER);

			for ( i = 0; i < this.plotTicks.length; i++) {
				if (this.ticksInside[i] && this.tickLabels[i] !== "") {
					this.parent.text(this.tickLabels[i], -this.offset - this.tickLabelOffset, this.plotTicks[i]);
				}
			}
		}

		this.parent.pop();
	}
};

GAxis.prototype.drawAsTopAxis = function() {
	var i;

	// Draw the ticks
	this.parent.push();
	this.parent.stroke(this.lineColor);
	this.parent.strokeWeight(this.lineWidth);
	this.parent.strokeCap(this.parent.SQUARE);
	this.parent.translate(0, -this.dim[1]);

	this.parent.line(0, -this.offset, this.dim[0], -this.offset);

	for ( i = 0; i < this.plotTicks.length; i++) {
		if (this.ticksInside[i]) {
			if (this.log && this.tickLabels[i] === "") {
				this.parent.line(this.plotTicks[i], -this.offset, this.plotTicks[i], -this.offset - this.smallTickLength);
			} else {
				this.parent.line(this.plotTicks[i], -this.offset, this.plotTicks[i], -this.offset - this.tickLength);
			}
		}
	}

	this.parent.pop();

	// Draw the tick labels
	if (this.drawTickLabels) {
		this.parent.push();
		this.parent.textFont(this.fontName);
		this.parent.textSize(this.fontSize);
		this.parent.fill(this.fontColor);
		this.parent.noStroke();
		this.parent.translate(0, -this.dim[1]);

		if (this.rotateTickLabels) {
			var halfPI = 0.5 * Math.PI;
			this.parent.textAlign(this.parent.LEFT, this.parent.CENTER);

			for ( i = 0; i < this.plotTicks.length; i++) {
				if (this.ticksInside[i] && this.tickLabels[i] !== "") {
					this.parent.push();
					this.parent.translate(this.plotTicks[i], -this.offset - this.tickLabelOffset);
					this.parent.rotate(-halfPI);
					this.parent.text(this.tickLabels[i], 0, 0);
					this.parent.pop();
				}
			}
		} else {
			this.parent.textAlign(this.parent.CENTER, this.parent.BOTTOM);

			for ( i = 0; i < this.plotTicks.length; i++) {
				if (this.ticksInside[i] && this.tickLabels[i] !== "") {
					this.parent.text(this.tickLabels[i], this.plotTicks[i], -this.offset - this.tickLabelOffset);
				}
			}
		}

		this.parent.pop();
	}
};

GAxis.prototype.drawAsRightAxis = function() {
	var i;

	// Draw the ticks
	this.parent.push();
	this.parent.stroke(this.lineColor);
	this.parent.strokeWeight(this.lineWidth);
	this.parent.strokeCap(this.parent.SQUARE);
	this.parent.translate(this.dim[0], 0);

	this.parent.line(this.offset, 0, this.offset, -this.dim[1]);

	for ( i = 0; i < this.plotTicks.length; i++) {
		if (this.ticksInside[i]) {
			if (this.log && this.tickLabels[i] === "") {
				this.parent.line(this.offset, this.plotTicks[i], this.offset + this.smallTickLength, this.plotTicks[i]);
			} else {
				this.parent.line(this.offset, this.plotTicks[i], this.offset + this.tickLength, this.plotTicks[i]);
			}
		}
	}

	this.parent.pop();

	// Draw the tick labels
	if (this.drawTickLabels) {
		this.parent.push();
		this.parent.textFont(this.fontName);
		this.parent.textSize(this.fontSize);
		this.parent.fill(this.fontColor);
		this.parent.noStroke();
		this.parent.translate(this.dim[0], 0);

		if (this.rotateTickLabels) {
			var halfPI = 0.5 * Math.PI;
			this.parent.textAlign(this.parent.CENTER, this.parent.TOP);

			for ( i = 0; i < this.plotTicks.length; i++) {
				if (this.ticksInside[i] && this.tickLabels[i] !== "") {
					this.parent.push();
					this.parent.translate(this.offset + this.tickLabelOffset, this.plotTicks[i]);
					this.parent.rotate(-halfPI);
					this.parent.text(this.tickLabels[i], 0, 0);
					this.parent.pop();
				}
			}
		} else {
			this.parent.textAlign(this.parent.LEFT, this.parent.CENTER);

			for ( i = 0; i < this.plotTicks.length; i++) {
				if (this.ticksInside[i] && this.tickLabels[i] !== "") {
					this.parent.text(this.tickLabels[i], this.offset + this.tickLabelOffset, this.plotTicks[i]);
				}
			}
		}

		this.parent.pop();
	}
};

GAxis.prototype.setDim = function() {
	var xDim, yDim;

	if (arguments.length === 2) {
		xDim = arguments[0];
		yDim = arguments[1];
	} else if (arguments.length === 1) {
		xDim = arguments[0][0];
		yDim = arguments[0][1];
	} else {
		throw new Error("GAxis.setDim(): signature not supported");
	}

	if (xDim > 0 && yDim > 0) {
		this.dim[0] = xDim;
		this.dim[1] = yDim;
		this.updatePlotTicks();
		this.lab.setDim(this.dim);
	}
};

GAxis.prototype.setLim = function(lim) {
	if (lim[1] !== lim[0]) {
		// Make sure the new limits makes sense
		if (this.log && (lim[0] <= 0 || lim[1] <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.lim[0] = lim[0];
			this.lim[1] = lim[1];

			if (!this.fixedTicks) {
				this.updateTicks();
				this.updateTickLabels();
			}

			this.updatePlotTicks();
			this.updateTicksInside();
		}
	}
};

GAxis.prototype.setLimAndLog = function(lim, log) {
	if (lim[1] !== lim[0]) {
		// Make sure the new limits makes sense
		if (log && (lim[0] <= 0 || lim[1] <= 0)) {
			console.log("One of the limits is negative. This is not allowed in logarithmic scale.");
		} else {
			this.lim[0] = lim[0];
			this.lim[1] = lim[1];
			this.log = log;

			if (!this.fixedTicks) {
				this.updateTicks();
				this.updateTickLabels();
			}

			this.updatePlotTicks();
			this.updateTicksInside();
		}
	}
};

GAxis.prototype.setLog = function(log) {
	if (log !== this.log) {
		this.log = log;

		// Check if the old limits still make sense
		if (this.log && (this.lim[0] <= 0 || this.lim[1] <= 0)) {
			console.log("The limits are negative. This is not allowed in logarithmic scale.");
			console.log("Will set them to (0.1, 10)");

			if (this.lim[1] > this.lim[0]) {
				this.lim[0] = 0.1;
				this.lim[1] = 10;
			} else {
				this.lim[0] = 10;
				this.lim[1] = 0.1;
			}
		}

		if (!this.fixedTicks) {
			this.updateTicks();
			this.updateTickLabels();
		}

		this.updatePlotTicks();
		this.updateTicksInside();
	}
};

GAxis.prototype.setOffset = function(offset) {
	this.offset = offset;
};

GAxis.prototype.setLineColor = function(lineColor) {
	this.lineColor = lineColor;
};

GAxis.prototype.setLineWidth = function(lineWidth) {
	if (lineWidth > 0) {
		this.lineWidth = lineWidth;
	}
};

GAxis.prototype.setNTicks = function(nTicks) {
	if (nTicks >= 0) {
		this.nTicks = nTicks;
		this.ticksSeparation = -1;
		this.fixedTicks = false;

		if (!this.log) {
			this.updateTicks();
			this.updatePlotTicks();
			this.updateTicksInside();
			this.updateTickLabels();
		}
	}
};

GAxis.prototype.setTicksSeparation = function(ticksSeparation) {
	this.ticksSeparation = ticksSeparation;
	this.fixedTicks = false;

	if (!this.log) {
		this.updateTicks();
		this.updatePlotTicks();
		this.updateTicksInside();
		this.updateTickLabels();
	}
};

GAxis.prototype.setTicks = function(ticks) {
	var n = ticks.length;
	this.adaptSize(this.ticks, n);

	for (var i = 0; i < n; i++) {
		this.ticks[i] = ticks[i];
	}

	this.fixedTicks = true;

	// Set the tick precision to undefined
	this.ticksPrecision = undefined;

	this.updatePlotTicks();
	this.updateTicksInside();
	this.updateTickLabels();
};

GAxis.prototype.setTickLabels = function(tickLabels) {
	if (tickLabels.length === this.tickLabels.length) {
		for (var i = 0; i < this.tickLabels.length; i++) {
			this.tickLabels[i] = tickLabels[i];
		}

		this.fixedTicks = true;

		// Set the tick precision to undefined
		this.ticksPrecision = undefined;
	}
};

GAxis.prototype.setFixedTicks = function(fixedTicks) {
	if (fixedTicks !== this.fixedTicks) {
		this.fixedTicks = fixedTicks;

		if (!this.fixedTicks) {
			this.updateTicks();
			this.updatePlotTicks();
			this.updateTicksInside();
			this.updateTickLabels();
		}
	}
};

GAxis.prototype.setTickLength = function(tickLength) {
	this.tickLength = tickLength;
};

GAxis.prototype.setSmallTickLength = function(smallTickLength) {
	this.smallTickLength = smallTickLength;
};

GAxis.prototype.setExpTickLabels = function(expTickLabels) {
	if (expTickLabels !== this.expTickLabels) {
		this.expTickLabels = expTickLabels;
		this.updateTickLabels();
	}
};

GAxis.prototype.setRotateTickLabels = function(rotateTickLabels) {
	this.rotateTickLabels = rotateTickLabels;
};

GAxis.prototype.setDrawTickLabels = function(drawTickLabels) {
	this.drawTickLabels = drawTickLabels;
};

GAxis.prototype.setTickLabelOffset = function(tickLabelOffset) {
	this.tickLabelOffset = tickLabelOffset;
};

GAxis.prototype.setDrawAxisLabel = function(drawAxisLabel) {
	this.drawAxisLabel = drawAxisLabel;
};

GAxis.prototype.setAxisLabelText = function(axisLabelText) {
	this.lab.setText(axisLabelText);
};

GAxis.prototype.setFontName = function(fontName) {
	this.fontName = fontName;
};

GAxis.prototype.setFontColor = function(fontColor) {
	this.fontColor = fontColor;
};

GAxis.prototype.setFontSize = function(fontSize) {
	if (fontSize > 0) {
		this.fontSize = fontSize;
	}
};

GAxis.prototype.setFontProperties = function(fontName, fontColor, fontSize) {
	if (fontSize > 0) {
		this.fontName = fontName;
		this.fontColor = fontColor;
		this.fontSize = fontSize;
	}
};

GAxis.prototype.setAllFontProperties = function(fontName, fontColor, fontSize) {
	this.setFontProperties(fontName, fontColor, fontSize);
	this.lab.setFontProperties(fontName, fontColor, fontSize);
};

GAxis.prototype.getTicks = function() {
	if (this.fixedTicks) {
		return this.ticks.slice();
	} else {
		// Return only the ticks that are visible
		var validTicks = [];
		var counter = 0;

		for (var i = 0; i < this.ticksInside.length; i++) {
			if (this.ticksInside[i]) {
				validTicks[counter] = this.ticks[i];
				counter++;
			}
		}

		return validTicks;
	}
};

GAxis.prototype.getTicksRef = function() {
	return this.ticks;
};

GAxis.prototype.getPlotTicks = function() {
	if (this.fixedTicks) {
		return this.plotTicks.slice();
	} else {
		var validPlotTicks = [];
		var counter = 0;

		for (var i = 0; i < this.ticksInside.length; i++) {
			if (this.ticksInside[i]) {
				validPlotTicks[counter] = this.plotTicks[i];
				counter++;
			}
		}

		return validPlotTicks;
	}
};

GAxis.prototype.getPlotTicksRef = function() {
	return this.plotTicks;
};

GAxis.prototype.getAxisLabel = function() {
	return this.lab;
};
