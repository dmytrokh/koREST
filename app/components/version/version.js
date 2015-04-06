'use strict';

angular.module('filehostApp.version', [
  'filehostApp.version.interpolate-filter',
  'filehostApp.version.version-directive'
])

.value('version', '0.1');
