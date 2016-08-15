/// <reference path="..\typings\index.d.ts" />
/// <reference path="interact.d.ts"/>
/// <reference path="angularDirective.ts" />
/// <reference path="dndService.ts"/>

module dndList {
    interface DndListScope extends angular.IScope {

    }

    @dndList.directive('$parse', '$timeout', 'dndService')
    class DndList implements ng.IDirective {
        constructor(private $parse: angular.IParseService,
            private $timeout: angular.ITimeoutService,
            private dndService: IDndService) {
        }

        public isMouseInFirstHalf(event, targetNode, horizontal = false) {
            var dragEvent = event.dragEvent;
            var mousePointer = horizontal ? dragEvent.clientX
                : dragEvent.clientY;
            var rect = targetNode.getBoundingClientRect();
            var targetSize = horizontal ? rect.width : rect.height;
            var targetPosition = horizontal ? rect.left : rect.top;
            return mousePointer < targetPosition + targetSize / 2;
        }

        public link: Function = (scope: DndListScope, element: ng.IAugmentedJQuery,
            attrs: any): void => {
            // While an element is dragged over the list, this placeholder element is inserted
            // at the location where the element would be inserted after dropping

            var horizontal = attrs.dndHorizontalList && scope.$eval(attrs.dndHorizontalList);
            var placeholder = this.getPlaceholderElement(element);
            var placeholderNode = placeholder[0];
            var listNode = element[0];
            placeholder.remove();
            var self = this;
            var dropX = 0;
            var dropY = 0;
            var unsubscribeDragStart: () => void;
            interact(element[0]).dropzone({
            }).on('dragenter', (event) => {
                dropX = 0;
                dropY = 0;
                self.dndService.isDroped = false;
            }).on('dragleave', (event) => {
                return self.stopDragover(placeholder, element);
            }).on('dropmove', (event) => {
                var source = angular.element(self.dndService.draggingElement);
                // First of all, make sure that the placeholder is shown
                // This is especially important if the list is empty
                if (placeholderNode.parentNode != listNode) {
                    element.append(placeholder);
                }
                var dragTarget: HTMLElement;
                var display = source.css('display');
                source.css('display', 'none');
                dragTarget = <HTMLElement>document.elementFromPoint(event.dragEvent.clientX, event.dragEvent.clientY);
                source.css('display', display);
                if (dragTarget !== listNode) {
                    // Try to find the node direct directly below the list node.
                    var listItemNode = dragTarget;
                    while (listItemNode.parentNode !== listNode && listItemNode.parentNode) {
                        listItemNode = <HTMLElement>listItemNode.parentNode;
                    }

                    if (listItemNode.parentNode === listNode && listItemNode !== placeholderNode) {
                        // If the mouse pointer is in the upper half of the child element,
                        // we place it before the child element, otherwise below it.
                        if (self.isMouseInFirstHalf(event, listItemNode)) {
                            listNode.insertBefore(placeholderNode, listItemNode);
                        } else {
                            listNode.insertBefore(placeholderNode, listItemNode.nextElementSibling);
                        }
                    }
                }

                if (attrs.dndDragover &&
                    !self.invokeCallback(scope, attrs.dndDragover, event,
                        self.getPlaceholderIndex(listNode, placeholderNode), self.dndService.draggingObject)) {
                    self.stopDragover(placeholder, element);
                }

                element.addClass("dndDragover");
            }).on('drop', (event) => {
                //disable dupl;icate invoke
                if (self.dndService.isDroped)
                    return;
                var transferredObject = self.dndService.draggingObject;
                if (!transferredObject)
                    return self.stopDragover(placeholder, element);
                transferredObject = angular.copy(transferredObject);
                self.$timeout(() => {
                    if (self.dndService.stopDrop) {
                        self.dndService.isDroped = false;
                        self.dndService.draggingElementScope.endDrag();
                        return self.stopDragover(placeholder, element);
                    }

                    // Invoke the callback, which can transform the transferredObject and even abort the drop.
                    var index = self.getPlaceholderIndex(listNode, placeholderNode);
                    if (index < 0)
                        return self.stopDragover(placeholder, element);

                    if (attrs.dndDragover &&
                        !self.invokeCallback(scope, attrs.dndDragover, event,
                            index, transferredObject)) {
                        return self.stopDragover(placeholder, element);
                    }
                    self.dndService.isDroped = true;
                    if (!self.dndService.draggingElementScope.endDrag(event))
                        return self.stopDragover(placeholder, element);
                    index = self.getPlaceholderIndex(listNode, placeholderNode);
                    if (attrs.dndDrop) {
                        transferredObject = self.invokeCallback(scope, attrs.dndDrop, event, index, transferredObject);
                        if (!transferredObject) {
                            return self.stopDragover(placeholder, element);
                        }
                    }

                    // Insert the object into the array, unless dnd-drop took care of that (returned true).
                    if (transferredObject !== true) {
                        scope.$eval(attrs.dndList).splice(index, 0, transferredObject);
                    }
                    self.invokeCallback(scope, attrs.dndInserted, event, index, transferredObject);

                    self.stopDragover(placeholder, element);
                }, 0);
            });
        }

        stopDragover(placeholder, element) {
            placeholder.remove();
            element.removeClass("dndDragover");
            return true;
        }

        getPlaceholderIndex(listNode, placeholderNode) {
            return Array.prototype.indexOf.call(listNode.children, placeholderNode);
        }

        invokeCallback(scope, expression, event, index, item = null) {
            return this.$parse(expression)(scope, {
                event: event,
                index: index,
                item: item || undefined
            });
        }

        public getPlaceholderElement(element: JQuery) {
            var placeholder: JQuery;
            angular.forEach(element.children(),
                (childNode) => {
                    var child = angular.element(childNode);
                    if (child.hasClass('dndPlaceholder')) {
                        placeholder = child;
                    }
                });
            return placeholder || angular.element("<li class='dndPlaceholder'></li>");
        }
    }
    angular.module('dndLists').directive('dndList',
        <any>DndList);

}