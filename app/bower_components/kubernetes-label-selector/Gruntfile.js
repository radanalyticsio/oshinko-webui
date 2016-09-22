module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['src/**/*.js'],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    qunit: {
      files: ['test/**/*.html']
    },
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'qunit'],
      css: {
        files: 'styles/*.less',
        tasks: ['less']
      }      
    },
    // The actual grunt server settings
    connect: {
      options: {
        protocol: grunt.option('scheme') || 'http',
        port: grunt.option('port') || 9000,
        hostname: grunt.option('hostname') || 'localhost'
      },
      server: {}
    },
    // Automatically inject Bower components into the app
    wiredep: {
      app: {
        src: ['index.html'],
        ignorePath:  /\.\.\//,
        exclude: []
      }
    },
    less: {
      production: {
        files: {
          'labelFilter.css': 'styles/labelFilter.less'
        },
        options: {
          plugins : [ new (require('less-plugin-autoprefix'))({browsers : [ "last 2 versions" ]}) ],
          cleancss: true,
          paths: ['styles']
        }
      }
    }    
  });

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-wiredep');  

  grunt.registerTask('serve', [
    'less',
    'wiredep',
    'connect:server',
    "watch"
  ]);  

  grunt.registerTask('default', ['serve']);

};
