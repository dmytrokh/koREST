'use strict';

//Demo app for kocloud.js
angular.module('filehostApp', [
    'kocloud',
    'ngRoute',
    'naif.base64',

    'filehostApp.filehost',
    'filehostApp.auth',
])
    .config(['$routeProvider', function($routeProvider) {
      $routeProvider.otherwise({redirectTo: '/filehost'});
    }]);
