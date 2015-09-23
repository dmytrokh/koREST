'use strict';

angular.module('kocloud', ['ngResource'])

    .constant('Conf', {
        'url': 'http://dev.kocloud.net/api/'
    })

    .factory('AuthServive', ['$resource', '$rootScope', 'Conf',
        function ($resource, $rootScope, Conf) {
            var auth = {};

            var api = $resource(Conf.url + 'Auth/:Func', {}, {
                user_info: {method: 'GET', params: {Func: 'GetUserInfo'}},
                login: {method: 'POST', params: {Func: 'Login'}},
                logout: {method: 'POST', params: {Func: 'Logout'}}
            });

            auth.Login = function (credentials) {
                var success = function (data) {
                    $rootScope.$broadcast('event:auth-loggedIn', data);
                };
                var error = function (data) {
                    $rootScope.$broadcast('event:auth-loginError', data);
                };
                api.login({}, credentials, success, error);
            };

            auth.Logout = function () {
                var success = function (data) {
                    $rootScope.$broadcast('event:auth-loggedOut', data);
                };
                var error = function (data) {
                    $rootScope.$broadcast('event:auth-logoutError', data);
                };
                api.logout({}, {}, success, error);
            };

            auth.GetUserInfo = function () {
                return api.user_info();
            };

            return auth;
        }

    ])

    .factory('FSItemService', ['$resource', '$rootScope', 'Conf',
        function ($resource, $rootScope, Conf) {

            var fs = {};

            var api = $resource(Conf.url + 'FSItem/:ItemIdParm/:PropertyNameParm', {ItemIdParm: '@idparam', PropertyNameParm: '@propertyname'}, {
                query: {method: 'GET', isArray: true},
                queryItem: {method: 'GET', isArray: false}
            });

            fs.ItemList = [];

            var error = function (data) {
                $rootScope.$broadcast('event:fsitem-error', data);
            };

            /*
            GetList:
              depth: Depth Int32 max recursion depth for child objects. 0 - current only, 1 - current and 1 level children, ...
              pagenum: pagenum int Page number
              pagesize: pagesize int Page size
              */
            fs.GetList = function (pagesize, pagenum, depth) {
                var params = {};
                if (depth != undefined)
                    params.depth = depth;
                else
                    params.depth = 0;

                if (pagesize != undefined)
                    params.pagesize = pagesize;
                else
                    params.pagesize = 50;

                if (pagenum != undefined)
                    params.pagenum = pagenum;
                else
                    params.pagenum = 0;

                params.cascade = false;

                var success = function (data) {
                    $rootScope.$broadcast('event:fsitem-ListReceived', data);
                };

                fs.ItemList = api.query(params, success, error);
            };

            fs.GetItem = function (ItemID, successCallback) {
                var success = function (data) {
                    if (successCallback != undefined)
                        successCallback(data);
                };
                return api.queryItem({ItemIdParm: ItemID}, success, error);
            };

            fs.GetItemProperty = function (ItemID, PropertyName, successCallback) {
                var success = function (data) {
                    if (successCallback != undefined)
                        successCallback(data);
                };
                return api.queryItem({ItemIdParm: ItemID, PropertyNameParm: PropertyName}, success , error);
            };

            fs.Save = function (filedata, successCallback) {
                var success = function (data) {
                    var ItemId = filedata.Id;
                    if (ItemId == 0) {
                        try {
                            ItemId = data.UidToIdMap[filedata.UID];
                        } catch(e) {ItemId = filedata.Id}
                    }

                    $rootScope.$broadcast('event:fsitem-saved', ItemId);
                    if (successCallback != undefined)
                        successCallback(ItemId);
                };
                return api.save({}, filedata, success, error);
            };

            fs.DeleteItem = function (ItemID) {
                var success = function (data) {
                    $rootScope.$broadcast('event:fsitem-deleted', ItemID);
                };

                return api.delete({ItemIdParm: ItemID}, success, error);
            };
            return fs;
        }

    ])

    .factory('wsService', ['$rootScope',
        function ($rootScope) {
            var connection = $.hubConnection();
            var proxy = connection.createHubProxy('FormTracker');
            return {
                connect: function () {
                    connection.start()
                        .done(function (data) {
                            $rootScope.$broadcast('event:ws-connected', data);
                        })
                        .fail(function (data) {
                            $rootScope.$broadcast('event:ws-fail', data);
                        });
                    proxy.on('OnUpdated', function (FormId) {
                        $rootScope.$broadcast('event:ws-updated', FormId);
                    });
                    connection.stateChanged(function(data){
                            $rootScope.$broadcast('event:ws-stateChanged', data);
                    });
                    connection.disconnected(function(){
                        $rootScope.$broadcast('event:ws-disconnected');
                    });
                },
                disconnect: function () {
                    connection.stop();
                },
                isConnecting: function () {
                    if (connection == undefined)
                        return false;
                    return connection.state === 0;
                },
                isConnected: function () {
                    if (connection == undefined)
                        return false;
                    return connection.state === 1;
                },
                connectionState: function () {
                    if (connection == undefined)
                        return false;
                    return connection.state;
                },
                TrackForms: function (FormIds) {
                    proxy.invoke('TrackForms', FormIds);
                }
            }
        }])

    .factory('cloudItem', ['$rootScope', 'FSItemService',
        function ($rootScope, FSItemService) {
            return function (name) {

                var guid = function () {
                    function s4() {
                        return Math.floor((1 + Math.random()) * 0x10000)
                            .toString(16)
                            .substring(1);
                    }
                    //return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    //    s4() + '-' + s4() + s4() + s4();
                    return s4() + s4() + '-' + s4() + s4();
                };

                if (name == undefined)
                    name = '';

                var ItemObject = {
                    "Id": 0
                    ,"Name": name
                    ,"Template": {Id: 1}
                    ,"Description": ''
                    ,"UID": guid()
                    ,"Notes": []
                    ,"Items": []
                };

                var setNotes = function(newNotes){
                    ItemObject.Notes = [];
                    newNotes.forEach(
                        function(value) {
                            value.isChange = false;
                            value.IsDeleted = false;
                            ItemObject.Notes.push(value);
                        }
                    );
                };

                var setItemObject = function (newItemObject) {
                    ItemObject = newItemObject;
                    this.ItemObject = ItemObject;
                };

                var getItemObject = function () {
                    return ItemObject;
                };

                var setId = function (newId) {
                    ItemObject.Id = newId;
                    
                };
                var setUID = function (newUID) {
                    ItemObject.UID = newUID;
                    
                };
                var setName = function (newName) {
                    ItemObject.Name = newName;
                    
                };
                var setDescription = function (newDescription) {
                    ItemObject.Description = newDescription;
                    
                };
                var setParentID = function (newParentID, successCallback) {
                    ItemObject.ParentID = newParentID;
                    if (newParentID == 0 || ItemObject.Id == 0)
                        return 0;

                    var data = {"Id": ItemObject.ParentID, "FileType": 0, "Items": [{"Id": 0, "Item": {"Id": ItemObject.Id}}]};
                    var ResolvedParent = function () {
                        if (successCallback != undefined)
                            successCallback(ItemObject.Id);
                    };
                    FSItemService.Save(data, ResolvedParent);                    
                };

                var Save = function (successCallback) {
                    if (ItemObject.UID == undefined)
                        ItemObject.UID = guid();

                    if (ItemObject.ParentID == undefined)
                        ItemObject.ParentID = 0;

                    if (ItemObject.Description == undefined)
                        ItemObject.Description = '';

                    var data = {"Id": ItemObject.Id, "Name": ItemObject.Name, "Template": ItemObject.Template, "Description": ItemObject.Description};

                    if (ItemObject.Id == 0)
                        data.UID = ItemObject.UID;

                    //setParentItem
                    var Resolved = function (ItemID) {
                        ItemObject.Id = ItemID;
                        if (ItemObject.ParentID != 0 && ItemObject.ParentID != undefined) {
                            setParentID(ItemObject.ParentID, successCallback);
                        }
                        else {
                            if (successCallback != undefined)
                                successCallback(ItemObject.Id);
                        }
                    };
                    FSItemService.Save(data, Resolved);
                };



                var AddNote = function (Note, successCallback) {
                    var data = {"Id": ItemObject.Id, "Notes": [{"Id": 0, "Item": Note}]};
                    var Resolved = function () {
                        if (successCallback != undefined)
                            successCallback(ItemObject.Id);
                    };
                    FSItemService.Save(data, Resolved);
                };

                var EditSingleNote = function (NoteId, Note, successCallback) {
                    if (NoteId == undefined)
                        NoteId = 0;
                    var data = {"Id": ItemObject.Id, "Notes": [{"Id": NoteId, "Item": Note}]};
                    var Resolved = function () {
                        if (successCallback != undefined)
                            successCallback(ItemObject.Id);
                    };
                    FSItemService.Save(data, Resolved);
                };

                var EditNotes = function (NotesList, successCallback) {
                    var notes = [];
                    NotesList.forEach(function(note) {
                            if (note.IsDeleted)
                                notes.push({"Id": note.Id, "IsDeleted": true});
                            else if (note.isChange)
                                notes.push({"Id": note.Id, "Item": note.Item});
                        }
                    );
                    if (notes.length == 0)
                        return;
                    var data = {"Id": ItemObject.Id, "Notes": notes};
                    var Resolved = function () {
                        if (successCallback != undefined)
                            successCallback(ItemObject.Id);
                    };
                    FSItemService.Save(data, Resolved);
                };

                var DelNote = function (NoteId, successCallback) {
                    var data = {"Id": ItemObject.Id, "Notes": [{"Id": NoteId, "IsDeleted": true}]};
                     var Resolved = function () {
                        if (successCallback != undefined)
                            successCallback(ItemObject.Id);
                    };
                    FSItemService.Save(data, Resolved);
                };

                var GetNotes = function (successCallback) {
                    var Resolved = function () {
                        setNotes(notesRet.Notes);
                        if (successCallback != undefined)
                            successCallback(ItemObject.Notes);
                    };
                    var notesRet = FSItemService.GetItemProperty(ItemObject.Id, "Notes", Resolved);
                };

                var AttachFile = function (FileID, successCallback) {
                    var data = {"Id": ItemObject.Id, "File": {"Id": FileID}};
                    var Resolved = function () {
                        if (successCallback != undefined)
                            successCallback(ItemObject.Id);
                    };
                    FSItemService.Save(data, Resolved);
                };

                var Get = function (data) {
                    if (data != undefined)
                        ItemObject.Id = data;
                    ItemObject = FSItemService.GetItem(ItemObject.Id);
                    ItemObject.$promise.then(this.setItemObject(ItemObject));
                    ItemObject.Id = data;
                };

                var Delete = function () {
                    FSItemService.DeleteItem(ItemObject.Id);
                };

                var Upload = function() {

                };

                return {
                    ItemObject: ItemObject

                    , getItemObject: getItemObject

                    , setItemObject: setItemObject
                    , setId: setId
                    , setUID: setUID
                    , setName: setName
                    , setDescription: setDescription
                    , setParentID: setParentID

                    , Save: Save
                    , Delete: Delete
                    , AttachFile: AttachFile
                    , AddNote: AddNote
                    , DelNote: DelNote
                    , EditSingleNote: EditSingleNote
                    , EditNotes: EditNotes
                    , GetNotes: GetNotes
                    , Get: Get
                };
            };
        }
    ])

    .directive('fileModel', ['$parse', function ($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var model = $parse(attrs.fileModel);
                var modelSetter = model.assign;

                element.bind('change', function () {
                    scope.$apply(function () {
                        //modelSetter(scope, element[0].files[0]);
                        modelSetter(scope, element[0].files);
                    });
                });
            }
        };
    }])

//    .factory('cloudItemServeice', ['$rootScope', 'FSItemService',
//    function ($rootScope, FSItemService) {
//
//        var Get = function (ItemObject) {
//            if (data != undefined)
//                ItemObject.Id = data;
//            ItemObject = FSItemService.GetItem(ItemObject.Id);
//            ItemObject.$promise.then(this.setItemObject(ItemObject));
//            ItemObject.Id = data;
//        };
//
//        var Delete = function () {
//            FSItemService.DeleteItem(ItemObject.Id);
//        };
//
//        return {
//            Get: Get
//            ,Delete: Delete
//        }
//    }
//])

;