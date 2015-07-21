angular.module('starter.services', ['http-auth-interceptor'])
	.factory('AuthenticationService', function ($window, $rootScope, $http, authService, $cookieStore) {

		var session = {
			username   : null,
			loginLevel : null,
			authorizationToken : null
		};

		var setSession = function(data){
			session.username           = data.username;
			session.loginLevel         = data.loginLevel;
			session.authorizationToken = data.authorizationToken;

			console.log('[setSession]', session);
		};

		var clearSession = function() {
			session.loginLevel = session.username = session.authorizationToken = null;
		};

		var service = {
			login : function (username, password) {
				$http.get('http://meirong-mifang.com/users/login.php', {params: {"username": username, "password": password}}, { ignoreAuthModule: true })
					.success(function (data, status, headers, config) {

						// var data = { "loginLevel": int, "username": String, "authorizationToken":String }
						// set session
						setSession(data);

						// register the authorization token to the local storage
						$window.localStorage.authorizationToken = session.authorizationToken;

						// set common header
						$http.defaults.headers.common.Authorization = data.authorizationToken;
						authService.loginConfirmed(data, function (config) {
							config.headers.Authorization = data.authorizationToken;
							return config;
						});

						// broadcast login
						$rootScope.$broadcast('event:auth-loginConfirmed');
					})
					.error(function (data, status, headers, config) {
						$rootScope.$broadcast('event:auth-login-failed', status);
					});
			},
			logout : function () {
				$http.get('http://meirong-mifang.com/users/logout.php')
					.success(function(data, status){
						clearSession();

						delete $window.localStorage.authorizationToken;
						delete $http.defaults.headers.common.Authorization;
						
						$rootScope.$broadcast('event:auth-logout-complete');
					});
			},
			loginCancelled : function () {
				authService.loginCancelled();
			},

			isLogged : function() {
				return (session.loginLevel != null && session.loginLevel > 0);
			},

			restoreSession : function() {
				if ($window.localStorage.authorizationToken) {
					$http.get('http://meirong-mifang.com/session/isLogged.php')
						.success(function(data, status){

							console.log('[restoreSession] success', data);

							// set session
							setSession(data);

							// set common header
							$http.defaults.headers.common.Authorization = data.authorizationToken;
							authService.loginConfirmed(data, function (config) {
								config.headers.Authorization = data.authorizationToken;
								return config;
							});

							// broadcast login
							$rootScope.$broadcast('event:auth-loginConfirmed');
						})
						.error(function(data, status){
							console.log('[restoreSession] error', data);
						});
				}
				else {
					console.log('[restoreSession] no authorizationToken found');
				}
			},

			// getters and setters
			getSession : function() {
				return session;
			}
		};

		// if the session is not initialized, try to restore it
		if (session.loginLevel == null) {
			service.restoreSession();
		}

		return service;
	});