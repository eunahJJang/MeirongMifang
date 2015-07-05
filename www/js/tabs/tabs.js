(function() {
	'use strict';

	angular.module('tabs-controllers', [])
		.controller('TabsCtrl', function($rootScope, $scope, $http, $state, $stateParams) {
		});

	angular.module('tabs', ['tabs-controllers']);
})();