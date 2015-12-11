'use strict';

/**
 * @ngdoc function
 * @name Pear2Pear.controller:ProjectsCtrl
 * @description
 * # ProjectsCtrl
 * Controller of the Pear2Pear
 */

angular.module('Pear2Pear')
  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider
      .when('/communities/:comId/projects', {
        templateUrl: 'projects/index.html',
        controller: 'ProjectsCtrl'
      })
      .when('/projects', {
        templateUrl: 'projects/index.html',
        controller: 'ProjectsCtrl'
      })
      .when('/communities/:comId/projects/:id', {
        redirectTo: function(params) {
          return '/communities/' + params.comId + '/projects/' + params.id + '/pad';
        }
      });
  }])
  .controller('ProjectsCtrl', [
  'SessionSvc', 'url', '$scope', '$location', '$route', 'time',
  'CommunitiesSvc', 'ProjectsSvc', 'ProfilesSvc', '$timeout', 'Loading',
  function (SessionSvc, url, $scope, $location, $route, time,
  CommunitiesSvc, ProjectsSvc, ProfilesSvc, $timeout, Loading) {

    $scope.urlId= url.urlId;

    var comUrlId = $route.current.params.comId;

    // get the count of new edits and chats for a list of projects and store them in the project properties
    function getNewsCounts(projs) {
      angular.forEach(projs, function(proj) {
        if (proj.contributors.indexOf(SessionSvc.users.current()) > -1) {
          proj.isContributor = true;

          ProfilesSvc.current().then(function(prof){
            $timeout(function(){
              proj.newMessagesCount = prof.getNewMessagesCount(proj);
              proj.padEditionCount = prof.getPadEditionCount(proj);
            });
          });
        }
      });
    }

    function getCommunities(projects) {
      angular.forEach(projects, function(p) {
        angular.forEach(p.communities, function(id) {
          CommunitiesSvc.find(id).then(function(c) {
            $timeout(function() {
              if (! p.loadedCommunities) {
                p.loadedCommunities = [];
              }

              p.loadedCommunities.push(c);
            });
          });
        });
      });
    }

    SessionSvc.onLoad(function(){
      if ($route.current.params.comId) {
        Loading.create(CommunitiesSvc.findByUrlId(comUrlId)).
          then(function(community){
            $scope.community = community;

            Loading.create(community.myAndPublicProjects()).
              then(function (projects){
                getNewsCounts(projects);

                $scope.projects = projects;
              });
          });
      } else {
        if (SessionSvc.users.loggedIn()) {
          Loading.create(ProjectsSvc.all({ contributor: SessionSvc.users.current() })).
            then(function(projects) {
              getCommunities(projects);

              $scope.projects = projects;
            });
        }
      }

      $scope.new_ = function () {
        SessionSvc.loginRequired(function() {
          ProjectsSvc.create(function(p) {
            //FIXME model prototype
            $location.path('/communities/' + url.urlId($scope.community.id) + '/projects/' + url.urlId(p.id) + '/pad');
          }, $scope.community.id);
        });
      };
    });

    $scope.participate = function() {
      SessionSvc.loginRequired(function() {
        $scope.community.addParticipant();
      });
    };

    // TODO: repeated code in NavbarTopCtrl
    $scope.shareIcon = function shareIcon(project) {
      switch (project.shareMode) {
        case 'link':
          return 'fa-link';
        case 'public':
          return 'fa-globe';
        default:
          return '';
      }
    };

    $scope.showProject = function(project, tabName) {
      $location.path('/communities/' + url.urlId(project.communities[0]) + '/projects/' + url.urlId(project.id) + '/' + (tabName || 'pad'));
    };

    // This function should belong to the model
    // In the prototype or something similar
    $scope.completedNeeds = function(project) {
      var completed = 0;

      angular.forEach(project.needs, function(need) {
        if (need.completed === 'true') {
          completed++;
        }
      });

      return completed;
    };

    $scope.totalNeeds = function(project) {
      if (project.needs === undefined) {
        return 0;
      }

      return project.needs.length;
    };

    $scope.progressPercentage = function(project) {
      var size = $scope.totalNeeds(project);

      if (size === 0) {
        return 0;
      }

      return $scope.completedNeeds(project) * 100 / size;
    };

    // Show at least 1%
    $scope.progressPercentageNotZero = function(project) {
      var value = $scope.progressPercentage(project);

      if (value === 0 && $scope.totalNeeds(project) > 0) {
        return 1;
      }

      return value;
    };

    $scope.progressType = function(project) {
      var percentage = $scope.progressPercentage(project);

      if (percentage < 33) {
        return 'danger';
      } else if (percentage > 66) {
        return 'success';
      } else {
        return 'warning';
      }
    };

    $scope.supporterCount = function(project) {
      // Migrate project.support
      return project.supporters.length;
    };

    $scope.contributorCount = function(project) {
      // Migrate project.support
      return project.contributors.length;
    };

    $scope.newMessagesCount = function(project) {
      return project.newMessagesCount;
    };

    $scope.padEditionCount = function(project) {
      return project.padEditionCount;
    };

    $scope.hour = function(msg) {
      return time.hour(new Date(msg.time));
    };

    var lastChatsCache = [];

    $scope.lastChat = function(project){
      if ($scope.newMessagesCount(project) > 0){
        if (!lastChatsCache[project.id] || lastChatsCache[project.id].index !== project.chat.length-1) {
          var lastChat = project.chat[project.chat.length-1];
          lastChatsCache[project.id] = {
            index: project.chat.length-1,
            who: lastChat.who,
            author: function() {
              if (!lastChat) {
                return '';
              }
              return lastChat.who.split('@')[0] + ':';
            },
            time: $scope.hour(lastChat),
            text: lastChat.text,
            isNotification: lastChat.standpoint === 'notification',
            translateValues: lastChat.translateValues
          };
        }
        return lastChatsCache[project.id];
      }
      return undefined;
    };

    $scope.emptyProjects = function(){
      return $scope.projects && (Object.keys($scope.projects).length === 0);
    };

    $scope.projectsUrl = function(communityId){
      if (communityId) {
        return '#/communities/' + $scope.urlId(communityId) + '/projects';
      } else {
        return '#/communities';
      }
    };

    $scope.editor = {
      editting: false
    };
  }]);
