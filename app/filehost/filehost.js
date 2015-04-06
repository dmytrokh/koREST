'use strict';

angular.module('filehostApp.filehost', ['ngRoute'])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/filehost', {
            templateUrl: 'filehost/filehost.html',
            controller: 'FileHostController'
        });
    }])

    .controller('FileHostController', [
        '$scope'
        , 'FSItemService'
        , 'cloudItem'
        , '$filter'
        , 'wsService'
        , function ($scope, FSItem, cloudItem, $filter, wsService) {

            $scope.itemsList = [];
            $scope.fsErrorText = '';
            $scope.currentPage = 0;
            $scope.pageSize = 30;
            $scope.deletedItems = 0;
            $scope.enableWebsocket = false;

            var currentParent = {};

            var getItemIndex = function(ItemId) {
                var index = -1;
                for (var i = 0; $scope.itemsList.length > i; i++) {
                    if ($scope.itemsList[i].ItemObject.Id === ItemId) {
                        index = i;
                        break;
                    }
                }
                return index;
            };

            $scope.query = function () {
                FSItem.GetList($scope.pageSize, $scope.currentPage, 0);
                $scope.deletedItems = 0;
            };

            $scope.nextPage = function () {
                $scope.currentPage++;
                $scope.query();
            };

            $scope.prevPage = function () {
                if ($scope.currentPage == 0)
                    return;
                $scope.currentPage--;
                $scope.query();
            };

            var registerWebsocket = function() {
                if (!$scope.enableWebsocket)
                    return;
                var formsToTrack = [];
                $scope.itemsList.forEach(function(value) {
                    formsToTrack.push(value.ItemObject.Id);
                });
                wsService.TrackForms(formsToTrack);
            };

            $scope.toggleWebsocket = function() {
                if ($scope.enableWebsocket)
                    wsService.connect();
                else
                    wsService.disconnect();
            };

            $scope.$on('event:ws-connected', function (event, data) {
                registerWebsocket();
                //$scope.fsErrorText = 'Hub connected...';
            });

            $scope.$on('event:ws-disconnected', function (event, data) {
                //$scope.fsErrorText = 'Hub disconnected';
            });

            $scope.query();//!!!

            $scope.$on('event:fsitem-ListReceived', function (event, data) {
                $scope.itemsList = [];
                var item = {};

                FSItem.ItemList.forEach(function (value) {
                    if (value.Name != undefined) { //probably child
                        item = new cloudItem();
                        item.setItemObject(value);
                        $scope.itemsList.push(item);
                    }
                });
                registerWebsocket();
            });

            $scope.$on('event:fsitem-deleted', function (event, delitedId) {
                    var indexToRemove = getItemIndex(delitedId);
                    if (indexToRemove >= 0)
                        $scope.itemsList.splice(indexToRemove, 1);
                    $scope.deletedItems++;
                }
            );
            $scope.$on('event:fsitem-error', function (event, data) {
                $scope.fsErrorText = "" + data.data.Code +": " + data.data.Message ;
            });

            $scope.$on('event:ws-updated', function (event, data) {
                var idx = getItemIndex(data);
                if (idx >= 0) {
                    $scope.itemsList[idx].Get(data);
                }
            });
            $scope.$on('event:fsitem-saved', function (event, data) {
                var idx = getItemIndex(data);
                if (idx >= 0) {
                    $scope.itemsList[idx].Get(data);
                } else {
                    var item = new cloudItem();
                    item.Get(data);
                    $scope.itemsList.unshift(item);
                }
            });

            $scope.newFolderName = '';
            $scope.addFolder = function () {
                var item = new cloudItem();
                item.setName($scope.newFolderName);
                var aftersave = function(itemId) {
                    item.Get(itemId);
                };
                item.Save(aftersave);
            };

            $scope.rename = function (item) {
                this.editorEnabled = !this.editorEnabled;
                if (this.editorEnabled)
                    this.oldName = item.ItemObject.Name;
                else {
                    if (this.oldName != item.ItemObject.Name){
                        item.Save();
                    }
                }
            };

            $scope.editDescription = function (item) {
                this.editorEnabledDescr = !this.editorEnabledDescr;
                if (this.editorEnabledDescr)
                    this.oldDescr = item.ItemObject.Description;
                else {
                    if (this.oldDescr != item.ItemObject.Description){
                        item.Save();
                    }
                }
            };

            $scope.notesList = [];
            var notesEditItem = {};
            var orderBy = $filter('orderBy');
            $scope.showNotes = function (item) {
                $scope.showModalNotes = !$scope.showModalNotes;
                if ($scope.showModalNotes) {
                    notesEditItem = item;
                    $scope.notesList = item.ItemObject.Notes;
                }
                else {
                    notesEditItem = {};
                    $scope.notesList = [];
                }
            };

            $scope.addNote = function () {
                var newNote = {"Id": 0, "Item": '', "ListIndex":9999};
                newNote.isChange = 0;
                $scope.notesList.push(newNote);
            };

            $scope.saveNote = function() {
                $scope.notesList.forEach(function(value){
                        if (value.IsDeleted)
                            notesEditItem.DelNote(value.Id);
                        if (value.isChange && !value.IsDeleted)
                            notesEditItem.EditNote(value.Id, value.Item)
                    }
                );
                notesEditItem.GetNotes();
            };

            $scope.saveNotes = function() {
                var onSaved = function() {
                    notesEditItem.GetNotes();
                };
                notesEditItem.EditNotes($scope.notesList, onSaved);
            };

            $scope.cancelNotes = function() {
                var idx = getItemIndex(notesEditItem.ItemObject.Id);
                if (idx < 0)
                    return;
                $scope.itemsList[idx].GetNotes();
                $scope.showNotes($scope.itemsList[idx]);
                $scope.showNotes($scope.itemsList[idx]);
            };


            $scope.isFolder = function (item) {
                if (item == undefined)
                    return false;
                if (item.Items == undefined)
                    return false;
                return (item.Items.length > 0);
                //return (item.FileType == 0);
            };

            $scope.uploadFile = function () {
                var binarydata = "data:" + $scope.selectedFile.filetype + ";base64," + $scope.selectedFile.base64;
                var data = {
                    Id: -1,
                    BinaryItem: binarydata,
                    MIME: $scope.selectedFile.filetype,
                    UID: $scope.selectedFile.filename
                };
                var uploaded = function (iddata) {
                    var file = new cloudItem(filename);
                    var resolved = function () {
                        file.AttachFile(iddata.Id);
                    };
                    file.Save(resolved);
                };
                FSItem.Save(data, uploaded);
            };

            $scope.newUpload = function() {
                //var blob = new Blob([$scope.selectedFile.base64], { type: $scope.selectedFile.filetype});
                //var data = {"Id": 0, "Data": {"Id": -1}, "Name":'Dolphins'};
                //var form = new FormData();
                //form.append('File',blob);
                //form.append('json',data);
                //FSItem.Save(form);

                var file = $scope.myFile;
                //var data = {Id:43602, Data:{Id:-1}, Name:'Dolphins', Description:'So long and thanks for all the fish'};
                var data = {"Id": 0, "Name":file.name, "Data":{"Id": -1}};
                //var file = new Blob([$scope.myFile], { type: $scope.myFile.type});
                var fd = new FormData();
                fd.append('Part1', file);
                fd.append('Part2', data);
                FSItem.Save(fd);
            };
        }
    ])

    .directive('modal', function () {
        return {
            template: '<div class="modal fade">' +
            '<div class="modal-dialog">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
            '<h4 class="modal-title">{{ title }}</h4>' +
            '</div>' +
            '<div class="modal-body" ng-transclude></div>' +
            '</div>' +
            '</div>' +
            '</div>',
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: true,
            link: function postLink(scope, element, attrs) {
                scope.title = attrs.title;

                scope.$watch(attrs.visible, function (value) {
                    if (value == true)
                        $(element).modal('show');
                    else
                        $(element).modal('hide');
                });

                $(element).on('shown.bs.modal', function () {
                    scope.$apply(function () {
                        scope.$parent[attrs.visible] = true;
                    });
                });

                $(element).on('hidden.bs.modal', function () {
                    scope.$apply(function () {
                        scope.$parent[attrs.visible] = false;
                    });
                });
            }
        };
    });