angular.module("demo").controller("ScrollDemoController", function($scope) {

    $scope.models = {
        selected: null,
        lists: {"A": [], "B": []}
    };
    $scope.scrollSettings={
        speed:7,
        offset:20,
        offsetOuter:10
    };
    // Generate initial model
    for (var i = 1; i <= 300; ++i) {
        $scope.models.lists.A.push({label: "Item A" + i});
    }
    for (var i = 1; i <= 10; ++i) {
        $scope.models.lists.B.push({label: "Item B" + i});
    }
});
