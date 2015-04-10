var multiplePlotsSketch = function(p) {
	// Global variables
	var plot1, plot2, plot3, plot4, i, index;
	var polygonPoints, mug, star;
	var gaussianStack, gaussianCounter, uniformStack, uniformCounter;

	// Load the image before the sketch is run
	p.preload = function() {
		mug = p.loadImage("data/beermug.png");
		star = p.loadImage("data/star.png");
	};

	// Initial setup
	p.setup = function() {
		// Create the canvas
		var canvas = p.createCanvas(850, 650);

		// Obtain the points for the first plot
		var points1a = [];
		var points1b = [];
		var points1c = [];

		for ( i = 0; i < 500; i++) {
			points1a[i] = new GPoint(i, p.noise(0.1 * i) + 1, "point " + i);
			points1b[i] = new GPoint(i, p.noise(500 + 0.1 * i) + 0.5, "point " + i);
			points1c[i] = new GPoint(i, p.noise(1000 + 0.1 * i), "point " + i);
		}

		// Create a polygon to display inside the plot
		polygonPoints = [];
		polygonPoints.push(new GPoint(2, 0.15));
		polygonPoints.push(new GPoint(6, 0.12));
		polygonPoints.push(new GPoint(15, 0.3));
		polygonPoints.push(new GPoint(8, 0.6));
		polygonPoints.push(new GPoint(1.5, 0.5));

		// Setup for the first plot
		plot1 = new GPlot(p);
		plot1.setPos(0, 0);
		plot1.setXLim(1, 100);
		plot1.setYLim(0.1, 3);
		plot1.getXAxis().getAxisLabel().setText("Time");
		plot1.getYAxis().getAxisLabel().setText("noise (0.1 time)");
		plot1.getTitle().setText("Multiple layers plot");
		plot1.setLogScale("xy");
		plot1.setPoints(points1a);
		plot1.setLineColor(p.color(200, 200, 255));
		plot1.addLayer("layer 1", points1b);
		plot1.getLayer("layer 1").setLineColor(p.color(150, 150, 255));
		plot1.addLayer("layer 2", points1c);
		plot1.getLayer("layer 2").setLineColor(p.color(100, 100, 255));

		// Leave empty the points for the second plot. We will fill them in draw()
		var points2 = [];

		// Setup for the second plot
		plot2 = new GPlot(p);
		plot2.setPos(460, 0);
		plot2.setDim(250, 250);
		plot2.getXAxis().getAxisLabel().setText("mouseX");
		plot2.getYAxis().getAxisLabel().setText("-mouseY");
		plot2.getTitle().setText("Mouse position");
		plot2.setPoints(points2);

		// Obtain the points for the third plot
		gaussianStack = [];
		gaussianCounter = 0;

		for ( i = 0; i < 10; i++) {
			gaussianStack[i] = 0;
		}

		for ( i = 0; i < 20; i++) {
			index = p.int(p.randomGaussian(gaussianStack.length / 2, 1));

			if (index >= 0 && index < gaussianStack.length) {
				gaussianStack[index]++;
				gaussianCounter++;
			}
		}

		var points3 = [];

		for ( i = 0; i < gaussianStack.length; i++) {
			points3[i] = new GPoint(i + 0.5 - gaussianStack.length / 2, gaussianStack[i] / gaussianCounter, "H" + i);
		}

		// Setup for the third plot
		plot3 = new GPlot(p);
		plot3.setPos(0, 300);
		plot3.setDim(250, 250);
		plot3.setYLim(-0.02, 0.45);
		plot3.setXLim(-gaussianStack.length / 2, gaussianStack.length / 2);
		plot3.getYAxis().getAxisLabel().setText("Relative probability");
		plot3.getYAxis().getAxisLabel().setTextAlignment(p.RIGHT);
		plot3.getYAxis().getAxisLabel().setRelativePos(1);
		plot3.getTitle().setText("Gaussian distribution (" + gaussianCounter + " points)");
		plot3.getTitle().setTextAlignment(p.LEFT);
		plot3.getTitle().setRelativePos(0);
		plot3.setPoints(points3);
		plot3.startHistograms(GPlot.VERTICAL);
		plot3.getHistogram().setDrawLabels(true);
		plot3.getHistogram().setRotateLabels(true);
		plot3.getHistogram().setBgColors([p.color(0, 0, 255, 50), p.color(0, 0, 255, 100), p.color(0, 0, 255, 150), p.color(0, 0, 255, 200)]);

		// Obtain the points for the fourth plot
		uniformStack = [];
		uniformCounter = 0;

		for ( i = 0; i < 30; i++) {
			uniformStack[i] = 0;
		}

		for ( i = 0; i < 20; i++) {
			index = p.int(p.random(uniformStack.length));

			if (index >= 0 && index < uniformStack.length) {
				uniformStack[index]++;
				uniformCounter++;
			}
		}

		var points4 = [];

		for ( i = 0; i < uniformStack.length; i++) {
			points4[i] = new GPoint(i + 0.5 - uniformStack.length / 2, uniformStack[i] / uniformCounter, "point " + i);
		}

		// Setup for the fourth plot
		plot4 = new GPlot(p);
		plot4.setPos(370, 350);
		plot4.setYLim(-0.005, 0.1);
		plot4.getXAxis().getAxisLabel().setText("x variable");
		plot4.getYAxis().getAxisLabel().setText("Relative probability");
		plot4.getTitle().setText("Uniform distribution (" + uniformCounter + " points)");
		plot4.getTitle().setTextAlignment(p.LEFT);
		plot4.getTitle().setRelativePos(0.1);
		plot4.setPoints(points4);
		plot4.startHistograms(GPlot.VERTICAL);

		// Setup the mouse actions
		plot1.activatePanning(p.LEFT, p.CONTROL);
		plot1.activatePointLabels();
		plot2.activateCentering();
		plot2.activateZooming(1.3, p.CENTER, p.CENTER);
		plot2.preventWheelDefault();
		plot3.activateCentering();
		plot4.activateZooming();
		plot4.preventRightClickDefault();

		// Resize the mug image
		mug.resize(0.5 * mug.width, 0.5 * mug.height);
	};

	// Execute the sketch
	p.draw = function() {
		// Clean the canvas
		p.background(255);

		// Draw the first plot
		plot1.beginDraw();
		plot1.drawBackground();
		plot1.drawBox();
		plot1.drawXAxis();
		plot1.drawYAxis();
		plot1.drawTopAxis();
		plot1.drawRightAxis();
		plot1.drawTitle();
		plot1.drawFilledContours(GPlot.HORIZONTAL, 0.05);
		plot1.drawPoint(new GPoint(65, 1.5), mug);
		plot1.drawPolygon(polygonPoints, p.color(255, 200));
		plot1.drawLabels();
		plot1.endDraw();

		// Add a new point to the second plot if the mouse moves significantly
		var points2 = plot2.getPoints();

		if (points2.length === 0) {
			points2.push(new GPoint(p.mouseX, -p.mouseY, "(" + p.mouseX + " , " + p.mouseY + ")"));
			plot2.setPoints(points2);
		} else {
			var lastPoint = points2[points2.length - 1];

			if (!lastPoint.isValid() || Math.pow(lastPoint.getX() - p.mouseX, 2) + Math.pow(lastPoint.getY() + p.mouseY, 2) > 2500) {
				points2.push(new GPoint(p.mouseX, -p.mouseY, "(" + p.mouseX + " , " + -p.mouseY + ")"));
				plot2.setPoints(points2);
			}
		}

		// Reset the points if the user pressed the space bar
		if (p.keyIsPressed && p.key === ' ') {
			plot2.setPoints([]);
		}

		// Draw the second plot
		plot2.beginDraw();
		plot2.drawBackground();
		plot2.drawBox();
		plot2.drawXAxis();
		plot2.drawYAxis();
		plot2.drawTitle();
		plot2.drawGridLines(GPlot.BOTH);
		plot2.drawLines();
		plot2.drawPoints(star);
		plot2.endDraw();

		// Add one more point to the gaussian stack
		index = p.int(p.randomGaussian(gaussianStack.length / 2, 1));

		if (index >= 0 && index < gaussianStack.length) {
			gaussianStack[index]++;
			gaussianCounter++;

			var points3 = [];

			for ( i = 0; i < gaussianStack.length; i++) {
				points3[i] = new GPoint(i + 0.5 - gaussianStack.length / 2, gaussianStack[i] / gaussianCounter, "H" + i);
			}

			plot3.setPoints(points3);
			plot3.getTitle().setText("Gaussian distribution (" + gaussianCounter + " points)");
		}

		// Draw the third plot
		plot3.beginDraw();
		plot3.drawBackground();
		plot3.drawBox();
		plot3.drawYAxis();
		plot3.drawTitle();
		plot3.drawHistograms();
		plot3.endDraw();

		// Actions over the fourth plot (scrolling)
		if (plot4.isOverBox(p.mouseX, p.mouseY)) {
			// Get the cursor relative position inside the inner plot area
			var relativePos = plot4.getRelativePlotPosAt(p.mouseX, p.mouseY);

			// Move the x axis
			if (relativePos[0] < 0.2) {
				plot4.moveHorizontalAxesLim(2);
			} else if (relativePos[0] > 0.8) {
				plot4.moveHorizontalAxesLim(-2);
			}

			// Move the y axis
			if (relativePos[1] < 0.2) {
				plot4.moveVerticalAxesLim(2);
			} else if (relativePos[1] > 0.8) {
				plot4.moveVerticalAxesLim(-2);
			}

			// Change the inner area bg color
			plot4.setBoxBgColor(p.color(200, 100));
		} else {
			plot4.setBoxBgColor(p.color(200, 50));
		}

		// Add one more point to the uniform stack
		index = p.int(p.random(uniformStack.length));

		if (index >= 0 && index < uniformStack.length) {
			uniformStack[index]++;
			uniformCounter++;

			var points4 = [];

			for ( i = 0; i < uniformStack.length; i++) {
				points4[i] = new GPoint(i + 0.5 - uniformStack.length / 2, uniformStack[i] / uniformCounter, "point " + i);
			}

			plot4.setPoints(points4);
			plot4.getTitle().setText("Uniform distribution (" + uniformCounter + " points)");
		}

		// Draw the forth plot
		plot4.beginDraw();
		plot4.drawBackground();
		plot4.drawBox();
		plot4.drawXAxis();
		plot4.drawYAxis();
		plot4.drawTitle();
		plot4.drawHistograms();
		plot4.endDraw();
	};
};
