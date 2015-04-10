module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg : grunt.file.readJSON('package.json'),
		jshint : {
			files : ['Gruntfile.js', 'src/**/*.js', 'examples/**/*.js'],
		},
		concat : {
			options : {
				separator : ''
			},
			dist : {
				src : ['src/GPoint.js', 'src/GTitle.js', 'src/GAxisLabel.js', 'src/GAxis.js', 'src/GHistogram.js', 'src/GLayer.js', 'src/GPlot.js'],
				dest : 'lib/<%= pkg.name %>.js'
			}
		},
		uglify : {
			options : {
				banner : '/*! <%= pkg.name %>.js (<%= pkg.version %>): a library for p5.js. Author: <%= pkg.author %>, license: <%= pkg.license %>, <%= grunt.template.today("yyyy-mm-dd") %> */ '
			},
			build : {
				src : 'lib/<%= pkg.name %>.js',
				dest : 'lib/<%= pkg.name %>.min.js'
			}
		},
		copy : {
			main : {
				files : [{
					expand : true,
					cwd : 'lib/',
					src : ['**'],
					dest : 'releases/'
				}]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');

	// Default task(s).
	grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'copy']);
};
