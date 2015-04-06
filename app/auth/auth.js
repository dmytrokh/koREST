'use strict';

angular.module('filehostApp.auth', [])

    .controller('AuthController', ['$scope', 'AuthServive',
        function ($scope, Auth) {
            $scope.showModal = false;

            $scope.loginErrorHTML = '';
            $scope.loginErrorTextClass = '';

            $scope.toggleModal = function () {
                $scope.showModal = !$scope.showModal;
            };

            var credentials = {};
            $scope.login = function () {
                credentials = {
                    UserName: this.username,
                    Password: this.password,
                    RememberMe: "false"
                };
                Auth.Login(credentials);
            };

            $scope.logout = function () {
                Auth.Logout();
            };

            $scope.getInfo = function () {
                $scope.userInfo = Auth.GetUserInfo();
            };
            $scope.getInfo();

            $scope.$on('event:auth-loggedIn', function (event, data) {
                $scope.showModal = false;
                $scope.getInfo();
                $scope.loginErrorText = '';
            });

            $scope.$on('event:auth-loginError', function (event, data) {
                $scope.loginErrorText = '' + data.status + ': ' + data.statusText;
            });

            $scope.$on('event:auth-loggedOut', function (event, data) {
                $scope.getInfo();
            });
        }
    ]);
