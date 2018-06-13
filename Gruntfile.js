/*
 After you have changed the settings at "Your code goes here",
 run this with one of these options:
  "grunt" alone creates a new, completed images directory
  "grunt clean" removes the images directory
  "grunt responsive_images" re-processes images without removing the old ones
*/

module.exports = function(grunt) {

  grunt.initConfig({
    responsive_images: {
      dev: {
        options: {
          engine: 'im',
          sizes: [{
            name: 'large',
            suffix: '_x1',
            width: 700
          },{
            name: 'large',
            suffix: '_x2',
            width: 1400
          },{
            name: 'medium',
            suffix: '_x1',
            width: 250
          },{
            name: 'medium',
            suffix: '_x2',
            width: 500
          }, {
            name: 'small',
            suffix: '_x1',
            width: 75
          },{
            name: 'small',
            suffix: '_x2',
            width: 75
          }]
        },

        /*
        You don't need to change this part if you don't change
        the directory structure.
        */
        files: [{
          expand: true,
          src: ['*.{gif,jpg,png}'],
          cwd: 'img/',
          dest: 'images_src/'
        }]
      }
    },

    /* Clear out the images directory if it exists */
    clean: {
      dev: {
        src: ['images_src'],
      },
    },

    /* Generate the images directory if it is missing */
    mkdir: {
      dev: {
        options: {
          create: ['images_src']
        },
      },
    },

    cssmin: {
      target: {
        files: [{
          expand: true,
          cwd: 'css',
          src: ['*.css', '!*.min.css'],
          dest: 'css',
          ext: '.min.css'
        }]
      }
    },
    // npm install gruntjs/grunt-contrib-uglify#harmony --save
    uglify: {
      options: {
        mangle: false
      },
      my_target: {
        files: {
          'js/main.min.js': ['js/dbhelper.js','js/main.js'],
          'js/restaurant_info.min.js':['js/dbhelper.js','js/restaurant_info.js']
        }
      }
    },

    cwebp: {
      /*static: {
        files: { 
          'dist/img-png.webp': 'src/img.png',
          'dist/img-jpg.webp': 'src/img.jpg',
          'dist/img-gif.webp': 'src/img.gif'
        }
      },*/
      dynamic: {
        options: {
          q: 50
        },
        files: [{
          expand: true,
        cwd: './',
          
          src: ['images_src/*.{png,jpg,gif}', 'img/*.{png,jpg,gif}'],
          dest: './'
        }]
      }
    },

    // gzip assets 1-to-1 for production
    compress: {
      main: {
        options: {
          mode: 'gzip'
        },
        expand: true,
        cwd: './',
        src: ['js/*min.*', 'css/*min.*'],
        dest: 'public/'
      }
    },

    /* Copy the "fixed" images that don't go through processing into the images/directory */
    copy: {
      dev: {
        files: [{
          expand: true,
          src: 'images_src/fixed/*.{gif,jpg,png}',
          dest: 'images/'
        },
        {
          expand: true,
          src: '*.{gif,jpg,png}',
          cwd: 'img',          
          dest: 'images_src'
        },
      ]
      },
    },
  });
  
  grunt.loadNpmTasks('grunt-responsive-images');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-mkdir');
  grunt.loadNpmTasks('grunt-cwebp');

  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-compress');

  grunt.loadNpmTasks('grunt-contrib-uglify-es');


  grunt.registerTask('default', ['clean', 'mkdir', 'copy', 'responsive_images', 'cwebp', 'cssmin', 'uglify', 'compress']);

  grunt.registerTask('deploy', ['cssmin', 'uglify', 'compress']);
  

};
