angular.module("demo").controller("MultiDemoController", function ($scope) {

  $scope.models = [
    { listName: "A", items: [], dragging: false },
    { listName: "B", items: [], dragging: false }
  ];

  /**
   * dnd-dragging determines what data gets serialized and send to the receiver
   * of the drop. While we usually just send a single object, we send the array
   * of all selected items here.
   */
  $scope.getSelectedItemsIncluding = function (list, item) {
    item.selected = true;
    return list.items.filter(function (item) { return item.selected; });
  };

  /**
   * In the dnd-drop callback, we now have to handle the data array that we
   * sent above. We handle the insertion into the list ourselves. By returning
   * true, the dnd-list directive won't do the insertion itself.
   */
  $scope.onDrop = function (list, items, index) {
    angular.forEach(items, function (item) { item.selected = false; item.dragging = false; });
    list.items = list.items.slice(0, index)
      .concat(items)
      .concat(list.items.slice(index));
    return true;
  }
  $scope.moved = function (list) {
    for (var i = 0; i < list.items.length; i++) {
      var item = list.items[i];
      if (item.selected) {
        list.items.splice(i, 1);
        i--;
      }
    }
  }
  // Generate the initial model
  angular.forEach($scope.models, function (list) {
    for (var i = 1; i <= 4; ++i) {
      list.items.push({ label: "Item " + list.listName + i });
    }
  });

  // Model to JSON for demo purpose
  $scope.$watch('models', function (model) {
    $scope.modelAsJson = angular.toJson(model, true);
  }, true);

});
