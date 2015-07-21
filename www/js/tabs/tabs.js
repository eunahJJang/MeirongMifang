(function() {
	'use strict';

	angular.module('tabs-controllers', [])
		.controller('TabsCtrl', function($rootScope, $scope, $http, $state, $stateParams, AuthenticationService) {

			$scope.onChat = function() {
				var loginLevel = AuthenticationService.getSession().loginLevel;

				//로그아웃 상태
				if (loginLevel === undefined || loginLevel < 1) {
					console.log('[TabsCtrl] $state', $state.current.name);
					$rootScope.$broadcast('event:auth-loginRequired', { state: $state.current.name });
				}

				//어드민계정
				else if (loginLevel > 1) {
					$state.go("app.tabs.chatAdmin");
				}

				//일반계정
				else if (loginLevel == 1) {
					$state.go("app.tabs.chatUser");
				}

				//예외
				else {

				}
			};

		});

	angular.module('tabs', ['tabs-controllers']);
})();