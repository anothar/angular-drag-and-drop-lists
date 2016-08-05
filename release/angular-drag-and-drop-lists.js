var dndList;
(function (dndList) {
    function directive() {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i - 0] = arguments[_i];
        }
        return function (target) {
            var directive = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                return (function (classConstructor, args, ctor) {
                    ctor.prototype = classConstructor.prototype;
                    var child = new ctor;
                    var result = classConstructor.apply(child, args);
                    return typeof result === "object" ? result : child;
                })(target, args, function () {
                    return null;
                });
            };
            directive.$inject = values;
            return directive;
        };
    }
    dndList.directive = directive;
})(dndList || (dndList = {}));

var dndList;
(function (dndList) {
    var DndService = (function () {
        function DndService() {
        }
        return DndService;
    }());
    angular.module('dndLists', []).service('dndService', DndService);
})(dndList || (dndList = {}));

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var dndList;
(function (dndList) {
    var DndDraggable = (function () {
        function DndDraggable($parse, $timeout, dndService) {
            var _this = this;
            this.$parse = $parse;
            this.$timeout = $timeout;
            this.dndService = dndService;
            this.link = function (scope, element, attrs) {
                var self = _this;
                var mouseX = 0;
                var mouseY = 0;
                var transformX = 0;
                var transformY = 0;
                var nodrop = false;
                var parent;
                var nextElement;
                var initwidth;
                var initheight;
                var isDragging = false;
                element.on('click touchstart', function (event) {
                    if (!attrs.dndSelected)
                        return;
                    scope.$apply(function () {
                        self.$parse(attrs.dndSelected)(scope, { event: event });
                    });
                    event.stopPropagation();
                });
                var unregisterDrag = function (elements) {
                    if (typeof elements == 'string') {
                        elements = element[0].querySelectorAll(elements);
                        for (var i = 0; i < elements.length; i++)
                            unregisterDrag(elements[i]);
                        return;
                    }
                    interact(elements).draggable(false);
                };
                scope.endDrag = function (event) {
                    if (!isDragging)
                        return;
                    isDragging = false;
                    var target = element[0];
                    target.style.webkitTransform =
                        target.style.transform = null;
                    element.removeClass("dndDragging");
                    element.remove();
                    var restoreState = function () {
                        element.css('height', initheight);
                        element.css('width', initwidth);
                        if (nextElement)
                            parent.insertBefore(target, nextElement);
                        else
                            parent.appendChild(target);
                    };
                    if (self.dndService.isDroped) {
                        if (!self.$parse(attrs.dndMoved)(scope, { event: event })) {
                            restoreState();
                        }
                    }
                    else {
                        restoreState();
                        self.$parse(attrs.dndCanceled)(scope, { event: event });
                    }
                    self.$parse(attrs.dndDragend)(scope, { event: event, isDroped: self.dndService.isDroped });
                    self.dndService.isDroped = false;
                };
                var registerDrag = function (elements) {
                    if (typeof elements == 'string') {
                        elements = element[0].querySelectorAll(elements);
                        for (var i = 0; i < elements.length; i++)
                            registerDrag(elements[i]);
                        return;
                    }
                    interact(elements).draggable({
                        inertia: true,
                        autoScroll: true,
                    }).on('dragstart', function (event) {
                        if (isDragging)
                            return;
                        isDragging = true;
                        var target = element[0];
                        var rect = target.getBoundingClientRect();
                        mouseX = rect.left - event.clientX;
                        mouseY = rect.top - event.clientY;
                        transformX = 0;
                        transformY = 0;
                        parent = element.parent()[0];
                        initheight = element.css('height');
                        initwidth = element.css('width');
                        nextElement = target.nextElementSibling;
                        element.addClass("dndDragging");
                        element.css('width', rect.width + "px");
                        element.css('height', rect.height + "px");
                        element.remove();
                        document.body.appendChild(target);
                        rect = target.getBoundingClientRect();
                        transformX += event.clientX - rect.left + mouseX;
                        transformY += event.clientY - rect.top + mouseY;
                        target.style.webkitTransform =
                            target.style.transform =
                                'translate(' + transformX + 'px, ' + transformY + 'px)';
                        self.dndService.draggingObject = scope.$eval(attrs.dndDraggable);
                        self.dndService.stopDrop = nodrop;
                        self.dndService.isDroped = false;
                        self.dndService.draggingElementScope = scope;
                        self.dndService.draggingElement = element[0];
                        self.$timeout(function () {
                            self.$parse(attrs.dndDragstart)(scope, { event: event });
                        }, 0);
                    }).on('dragend', function (event) {
                        self.$timeout(function () { scope.endDrag(event); }, 0);
                    }).on('dragmove', function (event) {
                        var rect = element[0].getBoundingClientRect();
                        var target = element[0];
                        transformX += event.clientX - rect.left + mouseX;
                        transformY += event.clientY - rect.top + mouseY;
                        target.style.webkitTransform =
                            target.style.transform =
                                'translate(' + transformX + 'px, ' + transformY + 'px)';
                    }).on('hold', function (event) {
                        var interaction = event.interaction;
                        if (!interaction.interacting()) {
                            interaction.start({ name: 'drag' }, event.interactable, event.currentTarget);
                        }
                    });
                };
                if (attrs.dndHandle) {
                    var handleString = scope.$eval(attrs.dndHandle);
                    registerDrag(handleString);
                    scope.$watch(attrs.dndHandle, function (newValue, oldValue, scope) {
                        unregisterDrag(oldValue);
                        registerDrag(newValue);
                    });
                }
                else {
                    registerDrag(element[0]);
                }
                if (attrs.dndNodrop) {
                    nodrop = scope.$eval(attrs.dndNodrop);
                    scope.$watch(attrs.dndNodrop, function (value) {
                        if (value == true)
                            interact(element[0]).draggable(false);
                        else
                            interact(element[0]).draggable(true);
                        nodrop = value;
                    });
                }
            };
        }
        DndDraggable = __decorate([
            dndList.directive('$parse', '$timeout', 'dndService')
        ], DndDraggable);
        return DndDraggable;
    }());
    angular.module('dndLists').directive('dndDraggable', DndDraggable);
})(dndList || (dndList = {}));

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var dndList;
(function (dndList) {
    var DndList = (function () {
        function DndList($parse, $timeout, dndService) {
            var _this = this;
            this.$parse = $parse;
            this.$timeout = $timeout;
            this.dndService = dndService;
            this.link = function (scope, element, attrs) {
                var horizontal = attrs.dndHorizontalList && scope.$eval(attrs.dndHorizontalList);
                var placeholder = _this.getPlaceholderElement(element);
                var placeholderNode = placeholder[0];
                var listNode = element[0];
                placeholder.remove();
                var self = _this;
                var dropX = 0;
                var dropY = 0;
                var unsubscribeDragStart;
                interact(element[0]).dropzone({}).on('dragenter', function (event) {
                    dropX = 0;
                    dropY = 0;
                }).on('dragleave', function (event) {
                    return self.stopDragover(placeholder, element);
                }).on('dropmove', function (event) {
                    var source = angular.element(self.dndService.draggingElement);
                    if (placeholderNode.parentNode != listNode) {
                        element.append(placeholder);
                    }
                    var dragTarget;
                    var display = source.css('display');
                    source.css('display', 'none');
                    dragTarget = document.elementFromPoint(event.dragEvent.clientX, event.dragEvent.clientY);
                    source.css('display', display);
                    if (dragTarget !== listNode) {
                        var listItemNode = dragTarget;
                        while (listItemNode.parentNode !== listNode && listItemNode.parentNode) {
                            listItemNode = listItemNode.parentNode;
                        }
                        if (listItemNode.parentNode === listNode && listItemNode !== placeholderNode) {
                            if (self.isMouseInFirstHalf(event, listItemNode)) {
                                listNode.insertBefore(placeholderNode, listItemNode);
                            }
                            else {
                                listNode.insertBefore(placeholderNode, listItemNode.nextElementSibling);
                            }
                        }
                    }
                    if (attrs.dndDragover &&
                        !self.invokeCallback(scope, attrs.dndDragover, event, self.getPlaceholderIndex(listNode, placeholderNode), self.dndService.draggingObject)) {
                        self.stopDragover(placeholder, element);
                    }
                    element.addClass("dndDragover");
                }).on('drop', function (event) {
                    var transferredObject = self.dndService.draggingObject;
                    if (!transferredObject)
                        return self.stopDragover(placeholder, element);
                    transferredObject = angular.copy(transferredObject);
                    self.$timeout(function () {
                        if (self.dndService.stopDrop) {
                            self.dndService.isDroped = false;
                            self.dndService.draggingElementScope.endDrag();
                            return self.stopDragover(placeholder, element);
                        }
                        var index = self.getPlaceholderIndex(listNode, placeholderNode);
                        if (index < 0)
                            return self.stopDragover(placeholder, element);
                        if (attrs.dndDragover &&
                            !self.invokeCallback(scope, attrs.dndDragover, event, index, transferredObject)) {
                            return self.stopDragover(placeholder, element);
                        }
                        self.dndService.isDroped = true;
                        self.dndService.draggingElementScope.endDrag(event);
                        index = self.getPlaceholderIndex(listNode, placeholderNode);
                        if (attrs.dndDrop) {
                            transferredObject = self.invokeCallback(scope, attrs.dndDrop, event, index, transferredObject);
                            if (!transferredObject) {
                                return self.stopDragover(placeholder, element);
                            }
                        }
                        if (transferredObject !== true) {
                            scope.$apply(function () {
                                scope.$eval(attrs.dndList).splice(index, 0, transferredObject);
                            });
                        }
                        self.invokeCallback(scope, attrs.dndInserted, event, index, transferredObject);
                        self.stopDragover(placeholder, element);
                    }, 0);
                });
            };
        }
        DndList.prototype.isMouseInFirstHalf = function (event, targetNode, horizontal) {
            if (horizontal === void 0) { horizontal = false; }
            var dragEvent = event.dragEvent;
            var mousePointer = horizontal ? dragEvent.clientX
                : dragEvent.clientY;
            var rect = targetNode.getBoundingClientRect();
            var targetSize = horizontal ? rect.width : rect.height;
            var targetPosition = horizontal ? rect.left : rect.top;
            return mousePointer < targetPosition + targetSize / 2;
        };
        DndList.prototype.stopDragover = function (placeholder, element) {
            placeholder.remove();
            element.removeClass("dndDragover");
            return true;
        };
        DndList.prototype.getPlaceholderIndex = function (listNode, placeholderNode) {
            return Array.prototype.indexOf.call(listNode.children, placeholderNode);
        };
        DndList.prototype.invokeCallback = function (scope, expression, event, index, item) {
            if (item === void 0) { item = null; }
            return this.$parse(expression)(scope, {
                event: event,
                index: index,
                item: item || undefined
            });
        };
        DndList.prototype.getPlaceholderElement = function (element) {
            var placeholder;
            angular.forEach(element.children(), function (childNode) {
                var child = angular.element(childNode);
                if (child.hasClass('dndPlaceholder')) {
                    placeholder = child;
                }
            });
            return placeholder || angular.element("<li class='dndPlaceholder'></li>");
        };
        DndList = __decorate([
            dndList.directive('$parse', '$timeout', 'dndService')
        ], DndList);
        return DndList;
    }());
    angular.module('dndLists').directive('dndList', DndList);
})(dndList || (dndList = {}));
