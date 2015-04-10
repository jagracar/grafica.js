var defaultPlotSketch = function(p) {
	// Initial setup
	p.setup = function() {
		// Create the canvas
		var canvas = p.createCanvas(500, 350);
		p.background(150);

		// Prepare the points for the plot
		var points = [];
		var seed = 100 * p.random();

		for (var i = 0; i < 100; i++) {
			points[i] = new GPoint(i, 10 * p.noise(0.1 * i + seed));
		}

		// Create a new plot and set its position on the screen
		var plot = new GPlot(p);
		plot.setPos(25, 25);

		// Set the plot title and the axis labels
		plot.setPoints(points);
		plot.getXAxis().setAxisLabelText("x axis");
		plot.getYAxis().setAxisLabelText("y axis");
		plot.setTitleText("A very simple example");

		// Draw it!
		plot.defaultDraw();

		p.noLoop();
	};
};
