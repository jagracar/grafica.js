var exponentialTrendSketch = function(p) {
	// Global variables
	var plot, logScale;

	// Initial setup
	p.setup = function() {
		// Create the canvas
		var canvas = p.createCanvas(450, 450);

		// Prepare the points for the plot
		var points = [];

		for (var i = 0; i < 1000; i++) {
			var x = 10 + p.random(200);
			var y = 10 * p.exp(0.015 * x);
			var xErr = p.randomGaussian(0, 2);
			var yErr = p.randomGaussian(0, 2);
			points[i] = new GPoint(x + xErr, y + yErr);
		}

		// Create the plot
		plot = new GPlot(p);
		plot.setPos(25, 25);
		plot.setDim(300, 300);
		// or all in one go
		// plot = new GPlot(p, 25, 25, 300, 300);

		// Set the plot title and the axis labels
		plot.setTitleText("Exponential law");
		plot.getXAxis().setAxisLabelText("x");

		if (logScale) {
			plot.setLogScale("y");
			plot.getYAxis().setAxisLabelText("log y");
		} else {
			plot.setLogScale("");
			plot.getYAxis().setAxisLabelText("y");
		}

		// Add the points to the plot
		plot.setPoints(points);
		plot.setPointColor(p.color(100, 100, 255, 50));
	};

	// Execute the sketch
	p.draw = function() {
		// Clean the canvas
		p.background(150);

		// Draw the plot
		plot.beginDraw();
		plot.drawBackground();
		plot.drawBox();
		plot.drawXAxis();
		plot.drawYAxis();
		plot.drawTopAxis();
		plot.drawRightAxis();
		plot.drawTitle();
		plot.drawPoints();
		plot.endDraw();
	};

	p.mouseClicked = function() {
		if (plot.isOverBox(p.mouseX, p.mouseY)) {
			// Change the log scale
			logScale = !logScale;

			if (logScale) {
				plot.setLogScale("y");
				plot.getYAxis().setAxisLabelText("log y");
			} else {
				plot.setLogScale("");
				plot.getYAxis().setAxisLabelText("y");
			}
		}
	};
};
